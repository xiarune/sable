const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ["admin", "super_admin"],
      default: "admin",
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(12); // Higher rounds for admin
  this.passwordHash = await bcrypt.hash(password, salt);
};

// Compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Return safe admin data
adminSchema.methods.toJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    displayName: this.displayName,
    role: this.role,
    lastLogin: this.lastLogin,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

// Indexes
adminSchema.index({ email: 1 });
adminSchema.index({ isActive: 1 });

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
