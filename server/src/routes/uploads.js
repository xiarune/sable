const express = require("express");
const multer = require("multer");
const { uploadToS3, deleteFromS3, getKeyFromUrl } = require("../config/s3");
const { requireAuth } = require("../middleware/auth");
const Upload = require("../models/Upload");

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

// All upload routes require authentication
router.use(requireAuth);

// POST /uploads/image - Upload an image
router.post("/image", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { key, url } = await uploadToS3(req.file, "images");

    // Save upload record
    const uploadRecord = new Upload({
      ownerId: req.user._id,
      type: "image",
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    await uploadRecord.save();

    res.status(201).json({
      message: "Image uploaded",
      upload: {
        _id: uploadRecord._id,
        url,
        type: "image",
        mimeType: req.file.mimetype,
        size: req.file.size,
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
