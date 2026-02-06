const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 500 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const communityPageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    link: { type: String, default: "" },

    // Media (S3 URLs)
    bannerImageUrl: { type: String, default: "" },
    profileImageUrl: { type: String, default: "" },

    // Settings
    visibility: {
      type: String,
      enum: ["public", "private", "following"],
      default: "public",
    },

    // Widgets
    widgets: {
      announcements: { type: Boolean, default: true },
      donations: { type: Boolean, default: false },
      recentWorks: { type: Boolean, default: true },
      chatroom: { type: Boolean, default: false },
    },

    // Announcements
    announcements: [announcementSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
communityPageSchema.index({ handle: 1 });
communityPageSchema.index({ userId: 1 });

const CommunityPage = mongoose.model("CommunityPage", communityPageSchema);

module.exports = CommunityPage;
