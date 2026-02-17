const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // Auth
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
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
    },
    needsUsername: {
      type: Boolean,
      default: false,
    },
    providers: {
      google: {
        googleId: { type: String, unique: true, sparse: true },
        email: String,
        name: String,
        picture: String,
      },
      apple: {
        appleId: { type: String, unique: true, sparse: true },
        email: String,
      },
      discord: {
        discordId: { type: String, unique: true, sparse: true },
        username: String,
      },
    },

    // Online presence
    presence: {
      status: {
        type: String,
        enum: ["online", "away", "offline"],
        default: "offline",
      },
      lastSeenAt: { type: Date, default: Date.now },
      lastActiveAt: { type: Date, default: Date.now },
    },

    // Profile
    avatarUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },
    link: { type: String, default: "" },
    pronouns: { type: String, default: "" },
    dateOfBirth: { type: Date },
    country: { type: String, default: "" },
    region: { type: String, default: "" },
    timezone: { type: String, default: "" },

    // Preferences
    preferences: {
      language: { type: String, default: "English" },
      theme: { type: String, default: "Default" },
      visibility: {
        type: String,
        enum: ["public", "private", "invisible"],
        default: "public",
      },
      // Reading preferences
      viewPrefs: {
        fontSize: { type: Number, default: 16, min: 13, max: 20 },
        lineHeight: { type: Number, default: 1.8, min: 1.6, max: 2.3 },
        readingWidth: { type: Number, default: 680, min: 560, max: 900 },
        theme: { type: String, enum: ["paper", "dark"], default: "paper" },
      },
      // Audio preferences
      audioPrefs: {
        autoplay: { type: Boolean, default: false },
        crossfade: { type: Boolean, default: false },
        crossfadeSeconds: { type: Number, default: 3 },
      },
      // Privacy preferences
      privacy: {
        showListeningActivity: { type: Boolean, default: true },
        showCollections: { type: Boolean, default: true },
        allowDMRequests: { type: Boolean, default: true },
      },
      // Notification preferences
      dmSetting: {
        type: String,
        enum: ["everyone", "community", "mutuals", "none"],
        default: "everyone",
      },
      silentMode: { type: Boolean, default: false },
      readReceipts: { type: Boolean, default: true },
    },

    // Content filters
    contentFilters: {
      mature: { type: Boolean, default: false },
      explicit: { type: Boolean, default: false },
      violence: { type: Boolean, default: false },
      selfHarm: { type: Boolean, default: false },
      spoilers: { type: Boolean, default: true },
    },

    // Blocked/muted
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mutedWords: [{ type: String }],

    // 2FA
    twoFactor: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ["authenticator", "sms", "backup_codes"] },
      secret: { type: String },
      backupCodes: [{ type: String }],
    },

    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },

    // Password reset
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // Pending email change
    pendingEmail: { type: String },
    pendingEmailToken: { type: String },
    pendingEmailExpires: { type: Date },

    // Notification settings
    notificationSettings: {
      emailOnNewFollower: { type: Boolean, default: true },
      emailOnNewComment: { type: Boolean, default: true },
      emailOnNewLike: { type: Boolean, default: false },
      emailOnNewMessage: { type: Boolean, default: true },
      emailOnNewChapter: { type: Boolean, default: true },
      emailDigest: { type: String, enum: ["none", "daily", "weekly"], default: "none" },
      pushOnNewFollower: { type: Boolean, default: true },
      pushOnNewComment: { type: Boolean, default: true },
      pushOnNewLike: { type: Boolean, default: true },
      pushOnNewMessage: { type: Boolean, default: true },
      pushOnNewChapter: { type: Boolean, default: true },
    },

    // Stats (denormalized for performance)
    stats: {
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      worksCount: { type: Number, default: 0 },
    },

    // Admin privileges
    isAdmin: { type: Boolean, default: false },

    // Inbox settings
    inboxSettings: {
      readReceipts: { type: Boolean, default: true },
      showSeenIndicators: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Methods
userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName || this.username,
    email: this.email,
    avatarUrl: this.avatarUrl,
    bannerUrl: this.bannerUrl,
    bio: this.bio,
    link: this.link,
    pronouns: this.pronouns,
    needsUsername: this.needsUsername,
    stats: this.stats,
    createdAt: this.createdAt,
  };
};

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
