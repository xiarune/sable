const mongoose = require("mongoose");

const adminSessionSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete expired sessions
adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
adminSessionSchema.index({ adminId: 1 });
adminSessionSchema.index({ token: 1 });

const AdminSession = mongoose.model("AdminSession", adminSessionSchema);

module.exports = AdminSession;
