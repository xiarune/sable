// Storage limits optimized for MongoDB Atlas free tier (500 MB, ~50 users)

module.exports = {
  // Drafts
  MAX_DRAFTS_PER_USER: 5,

  // Works (published)
  MAX_WORKS_PER_USER: 10,

  // Chapters
  MAX_CHAPTERS: 30,
  MAX_BODY_LENGTH: 25000, // ~5,000 words per chapter
  MAX_TITLE_LENGTH: 200,

  // Tags
  MAX_TAGS: 20,
  MAX_TAG_LENGTH: 30,

  // Posts (community)
  MAX_POSTS_PER_DAY: 10,
  MAX_POST_LENGTH: 2000,

  // Comments
  MAX_COMMENT_LENGTH: 500,

  // User profile
  MAX_BIO_LENGTH: 500,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,

  // Media (URLs only - actual files stored in S3)
  MAX_IMAGES_PER_DRAFT: 10,
  MAX_IMAGES_PER_WORK: 10,
};
