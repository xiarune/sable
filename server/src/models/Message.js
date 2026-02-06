const mongoose = require("mongoose");

// Individual message
const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderUsername: { type: String, required: true },
    text: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    // File attachment (S3 URL)
    attachmentUrl: { type: String, default: "" },
    attachmentType: { type: String, default: "" },
    attachmentName: { type: String, default: "" },

    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ threadId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
