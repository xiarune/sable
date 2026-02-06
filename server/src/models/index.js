// Core
const User = require("./User");
const Draft = require("./Draft");
const Work = require("./Work");
const Upload = require("./Upload");

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

// Audio
const AudioTrack = require("./AudioTrack");

// Discovery
const Genre = require("./Genre");
const Fandom = require("./Fandom");
const Tag = require("./Tag");

// Monetization
const Donation = require("./Donation");

module.exports = {
  // Core
  User,
  Draft,
  Work,
  Upload,

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

  // Audio
  AudioTrack,

  // Discovery
  Genre,
  Fandom,
  Tag,

  // Monetization
  Donation,
};
