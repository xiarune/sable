// Core
const User = require("./User");
const Draft = require("./Draft");
const Work = require("./Work");
const Upload = require("./Upload");
const Session = require("./Session");

// Community & Social
const Post = require("./Post");
const Comment = require("./Comment");
const Follow = require("./Follow");
const Like = require("./Like");
const Bookmark = require("./Bookmark");
const Notification = require("./Notification");

// Messaging
const Thread = require("./Thread");
const Message = require("./Message");

// Community Page
const CommunityPage = require("./CommunityPage");

// Skins
const Skin = require("./Skin");

// Audio
const AudioTrack = require("./AudioTrack");

// Discovery
const Genre = require("./Genre");
const Fandom = require("./Fandom");
const Tag = require("./Tag");

// Monetization
const Donation = require("./Donation");

// Admin
const Admin = require("./Admin");
const AdminSession = require("./AdminSession");
const Contact = require("./Contact");
const Warning = require("./Warning");

// Reports
const Report = require("./Report");

module.exports = {
  // Core
  User,
  Draft,
  Work,
  Upload,
  Session,

  // Community & Social
  Post,
  Comment,
  Follow,
  Like,
  Bookmark,
  Notification,

  // Messaging
  Thread,
  Message,

  // Community Page
  CommunityPage,

  // Skins
  Skin,

  // Audio
  AudioTrack,

  // Discovery
  Genre,
  Fandom,
  Tag,

  // Monetization
  Donation,

  // Admin
  Admin,
  AdminSession,
  Contact,
  Warning,

  // Reports
  Report,
};
