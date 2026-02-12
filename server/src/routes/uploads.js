const express = require("express");
const multer = require("multer");
const { uploadToS3, deleteFromS3, getKeyFromUrl } = require("../config/s3");
const { requireAuth } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { optimizeImage, validateImage } = require("../utils/imageOptimizer");
const Upload = require("../models/Upload");
const logger = require("../utils/logger");

const router = express.Router();

// Configure multer for memory storage - images
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Allowed: jpeg, png, gif, webp`), false);
    }
  },
});

// Configure multer for audio - larger limit
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max for audio
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/webm",
      "audio/mp3",
      "audio/x-m4a",
      "audio/aac",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Audio type ${file.mimetype} not allowed. Allowed: mp3, wav, ogg, mp4, webm, m4a, aac`), false);
    }
  },
});

// Legacy upload for backwards compatibility
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/webm",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  },
});

// Configure multer for generic files (chat attachments)
const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max for files
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types for chat attachments
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  },
});

// All upload routes require authentication and rate limiting
router.use(requireAuth);
router.use(uploadLimiter);

// POST /uploads/image - Upload an image
router.post("/image", uploadImage.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate image
    const validation = await validateImage(req.file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    // Get optimization options from query params
    const preset = req.query.preset; // 'avatar', 'banner', 'cover', 'content'
    const quality = parseInt(req.query.quality) || 80;
    const format = req.query.format || "webp";

    // Optimize image
    let optimizedBuffer;
    let optimizedMimeType;

    if (preset === "avatar" || preset === "banner" || preset === "cover") {
      // Use preset dimensions
      const presetConfigs = {
        avatar: { width: 256, height: 256, fit: "cover" },
        banner: { width: 1200, height: 400, fit: "cover" },
        cover: { width: 400, height: 600, fit: "cover" },
      };
      optimizedBuffer = await optimizeImage(req.file.buffer, {
        ...presetConfigs[preset],
        quality,
        format,
      });
    } else {
      // Default optimization - resize large images, convert to webp
      optimizedBuffer = await optimizeImage(req.file.buffer, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality,
        format,
      });
    }

    optimizedMimeType = `image/${format === "jpg" ? "jpeg" : format}`;

    // Create optimized file object for upload
    const optimizedFile = {
      buffer: optimizedBuffer,
      mimetype: optimizedMimeType,
      originalname: req.file.originalname.replace(/\.[^.]+$/, `.${format}`),
    };

    const { key, url } = await uploadToS3(optimizedFile, "images");

    // Calculate size reduction
    const originalSize = req.file.size;
    const optimizedSize = optimizedBuffer.length;
    const reduction = Math.round((1 - optimizedSize / originalSize) * 100);

    logger.info("Image optimized and uploaded", {
      userId: req.user._id,
      originalSize,
      optimizedSize,
      reduction: `${reduction}%`,
    });

    // Save upload record
    const uploadRecord = new Upload({
      ownerId: req.user._id,
      type: "image",
      url,
      mimeType: optimizedMimeType,
      size: optimizedSize,
    });
    await uploadRecord.save();

    res.status(201).json({
      message: "Image uploaded",
      upload: {
        _id: uploadRecord._id,
        url,
        type: "image",
        mimeType: optimizedMimeType,
        size: optimizedSize,
        originalSize,
        reduction: `${reduction}%`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /uploads/audio - Upload audio (up to 50MB)
router.post("/audio", uploadAudio.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { title, workId } = req.body;

    logger.info("Audio upload started", {
      userId: req.user._id,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });

    const { key, url } = await uploadToS3(req.file, "audio");

    // Save upload record
    const uploadRecord = new Upload({
      ownerId: req.user._id,
      type: "audio",
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      title: title || req.file.originalname || "Audio Track",
      workId: workId || null,
    });
    await uploadRecord.save();

    logger.info("Audio upload completed", {
      userId: req.user._id,
      uploadId: uploadRecord._id,
      url,
    });

    res.status(201).json({
      message: "Audio uploaded",
      url,
      upload: {
        _id: uploadRecord._id,
        url,
        type: "audio",
        mimeType: req.file.mimetype,
        size: req.file.size,
        title: uploadRecord.title,
      },
    });
  } catch (err) {
    logger.error("Audio upload failed", {
      userId: req.user?._id,
      error: err.message,
    });
    next(err);
  }
});

// POST /uploads/file - Upload generic file (for chat attachments)
router.post("/file", uploadFile.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    logger.info("File upload started", {
      userId: req.user._id,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });

    const { key, url } = await uploadToS3(req.file, "files");

    // Save upload record
    const uploadRecord = new Upload({
      ownerId: req.user._id,
      type: "file",
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      title: req.file.originalname,
    });
    await uploadRecord.save();

    logger.info("File upload completed", {
      userId: req.user._id,
      uploadId: uploadRecord._id,
      url,
    });

    res.status(201).json({
      message: "File uploaded",
      url,
      upload: {
        _id: uploadRecord._id,
        url,
        type: "file",
        mimeType: req.file.mimetype,
        size: req.file.size,
        name: req.file.originalname,
      },
    });
  } catch (err) {
    logger.error("File upload failed", {
      userId: req.user?._id,
      error: err.message,
    });
    next(err);
  }
});

// GET /uploads/audio/user/:username - Get a user's audio uploads (public)
router.get("/audio/user/:username", async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findOne({ username: req.params.username.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const audios = await Upload.find({ ownerId: user._id, type: "audio" })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ audios });
  } catch (err) {
    next(err);
  }
});

// GET /uploads - List my uploads
router.get("/", async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = { ownerId: req.user._id };

    if (type && ["image", "audio"].includes(type)) {
      query.type = type;
    }

    const uploads = await Upload.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ uploads });
  } catch (err) {
    next(err);
  }
});

// DELETE /uploads/:id - Delete an upload
router.delete("/:id", async (req, res, next) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    if (upload.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete from S3
    const key = getKeyFromUrl(upload.url);
    if (key) {
      await deleteFromS3(key);
    }

    // Delete record
    await Upload.findByIdAndDelete(upload._id);

    res.json({ message: "Upload deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
