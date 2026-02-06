const express = require("express");

// Import all route modules
const authRoutes = require("./auth");
const draftsRoutes = require("./drafts");
const uploadsRoutes = require("./uploads");
const worksRoutes = require("./works");
const postsRoutes = require("./posts");
const commentsRoutes = require("./comments");
const followsRoutes = require("./follows");
const likesRoutes = require("./likes");
const bookmarksRoutes = require("./bookmarks");
const notificationsRoutes = require("./notifications");
const messagesRoutes = require("./messages");
const usersRoutes = require("./users");
const communityRoutes = require("./community");
const audioRoutes = require("./audio");
const discoveryRoutes = require("./discovery");

const router = express.Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/drafts", draftsRoutes);
router.use("/uploads", uploadsRoutes);
router.use("/works", worksRoutes);
router.use("/posts", postsRoutes);
router.use("/comments", commentsRoutes);
router.use("/follows", followsRoutes);
router.use("/likes", likesRoutes);
router.use("/bookmarks", bookmarksRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/messages", messagesRoutes);
router.use("/users", usersRoutes);
router.use("/community", communityRoutes);
router.use("/audio", audioRoutes);
router.use("/discovery", discoveryRoutes);

module.exports = router;
