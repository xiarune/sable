const express = require("express");
const multer = require("multer");
const { uploadToS3, deleteFromS3, getKeyFromUrl } = require("../config/s3");
const { requireAuth } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { optimizeImage, validateImage } = require("../utils/imageOptimizer");
const Upload = require("../models/Upload");
const logger = require("../utils/logger");

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow images and audio
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

// All upload routes require authentication and rate limiting
router.use(requireAuth);
router.use(uploadLimiter);

// POST /uploads/image - Upload an image
router.post("/image", upload.single("file"), async (req, res, next) => {
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

// POST /uploads/audio - Upload audio
router.post("/audio", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { key, url } = await uploadToS3(req.file, "audio");

    // Save upload record
    const uploadRecord = new Upload({
      ownerId: req.user._id,
      type: "audio",
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    await uploadRecord.save();

    res.status(201).json({
      message: "Audio uploaded",
      upload: {
        _id: uploadRecord._id,
        url,
        type: "audio",
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
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
