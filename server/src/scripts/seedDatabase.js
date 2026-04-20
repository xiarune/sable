/**
 * Database Seed Script
 *
 * Automatically seeds the database with demo content on first startup.
 * Checks if database is empty before seeding to avoid duplicates.
 */

const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { Genre, Fandom, Tag, User, Work, Admin, Post } = require("../models");

// Load seed data
const genres = require("../data/seed/genres.json");
const fandoms = require("../data/seed/fandoms.json");
const tags = require("../data/seed/tags.json");
const users = require("../data/seed/users.json");
const works = require("../data/seed/works.json");
const adminData = require("../data/seed/admin.json");
const posts = require("../data/seed/posts.json");

/**
 * Check if database needs seeding
 */
async function isDatabaseEmpty() {
  const genreCount = await Genre.countDocuments();
  return genreCount === 0;
}

/**
 * Seed genres
 */
async function seedGenres() {
  console.log("  Seeding genres...");
  await Genre.insertMany(genres);
  console.log(`  ✓ Created ${genres.length} genres`);
}

/**
 * Seed fandoms
 */
async function seedFandoms() {
  console.log("  Seeding fandoms...");
  await Fandom.insertMany(fandoms);
  console.log(`  ✓ Created ${fandoms.length} fandoms`);
}

/**
 * Seed tags
 */
async function seedTags() {
  console.log("  Seeding tags...");
  await Tag.insertMany(tags);
  console.log(`  ✓ Created ${tags.length} tags`);
}

/**
 * Seed demo users
 */
async function seedUsers() {
  console.log("  Seeding demo users...");
  const createdUsers = [];

  for (const userData of users) {
    const user = new User({
      username: userData.username,
      displayName: userData.displayName,
      email: userData.email,
      bio: userData.bio,
      interests: userData.interests,
      emailVerified: true,
    });
    await user.setPassword(userData.password);
    await user.save();
    createdUsers.push(user);
  }

  console.log(`  ✓ Created ${createdUsers.length} demo users`);
  return createdUsers;
}

/**
 * Seed admin account
 */
async function seedAdmin() {
  console.log("  Seeding admin account...");

  const existing = await Admin.findOne({ username: adminData.username });
  if (existing) {
    console.log("  ✓ Admin account already exists, skipping");
    return;
  }

  const admin = new Admin({
    username: adminData.username,
    email: adminData.email,
    displayName: adminData.displayName,
    role: adminData.role,
    isActive: true,
  });
  await admin.setPassword(adminData.password);
  await admin.save();

  console.log(`  ✓ Created admin account: ${adminData.username}`);
}

/**
 * Seed sample works
 */
async function seedWorks(createdUsers) {
  console.log("  Seeding sample works...");

  // Create a map of username to user for easy lookup
  const userMap = {};
  for (const user of createdUsers) {
    userMap[user.username] = user;
  }

  let worksCreated = 0;

  for (const workData of works) {
    const author = userMap[workData.authorUsername];
    if (!author) {
      console.warn(`  Warning: Author ${workData.authorUsername} not found, skipping work`);
      continue;
    }

    // Add unique IDs and order to chapters
    const chapters = workData.chapters.map((chapter, index) => ({
      id: uuidv4(),
      title: chapter.title,
      body: chapter.body,
      order: index,
      audioUrl: "",
    }));

    const work = new Work({
      authorId: author._id,
      authorUsername: author.username,
      title: workData.title,
      description: workData.description,
      genre: workData.genre,
      fandom: workData.fandom,
      tags: workData.tags,
      progressStatus: workData.progressStatus,
      chapters: chapters,
      privacy: "Public",
      status: "published",
    });

    await work.save();
    worksCreated++;

    // Update author's works count
    await User.findByIdAndUpdate(author._id, {
      $inc: { "stats.worksCount": 1 },
    });

    // Update genre works count
    if (workData.genre) {
      await Genre.findOneAndUpdate(
        { slug: workData.genre },
        { $inc: { worksCount: 1 } }
      );
    }

    // Update fandom works count
    if (workData.fandom) {
      await Fandom.findOneAndUpdate(
        { slug: workData.fandom },
        { $inc: { worksCount: 1 } }
      );
    }

    // Update tag usage counts
    for (const tagSlug of workData.tags) {
      await Tag.findOneAndUpdate(
        { slug: tagSlug },
        { $inc: { usageCount: 1 } }
      );
    }
  }

  console.log(`  ✓ Created ${worksCreated} sample works`);
}

/**
 * Seed sample posts
 */
async function seedPosts(createdUsers) {
  console.log("  Seeding sample posts...");

  // Create a map of username to user for easy lookup
  const userMap = {};
  for (const user of createdUsers) {
    userMap[user.username] = user;
  }

  let postsCreated = 0;

  for (const postData of posts) {
    const author = userMap[postData.authorUsername];
    if (!author) {
      console.warn(`  Warning: Author ${postData.authorUsername} not found, skipping post`);
      continue;
    }

    const post = new Post({
      authorId: author._id,
      authorUsername: author.username,
      type: postData.type || "post",
      title: postData.title || null,
      content: postData.content,
      caption: postData.caption || null,
      tags: postData.tags || [],
    });

    await post.save();
    postsCreated++;
  }

  console.log(`  ✓ Created ${postsCreated} sample posts`);
}

/**
 * Main seed function - call this on server startup
 */
async function seedDatabase() {
  try {
    const isEmpty = await isDatabaseEmpty();

    if (!isEmpty) {
      console.log("📦 Database already seeded, skipping...");
      return;
    }

    console.log("🌱 First run detected - seeding database...");

    // Seed in dependency order
    await seedGenres();
    await seedFandoms();
    await seedTags();
    const createdUsers = await seedUsers();
    await seedAdmin();
    await seedWorks(createdUsers);
    await seedPosts(createdUsers);

    console.log("✅ Database seeding complete!");
    console.log("");
    console.log("Demo accounts (password: demo123456):");
    console.log("  - storyweaver, inkspiller, wordsmith, poeticmuse");
    console.log("");
    console.log("Admin account:");
    console.log("  - Username: admin");
    console.log("  - Password: SableAdmin2024!");
    console.log("  - Access: /admin/login");
    console.log("");
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
    throw error;
  }
}

module.exports = { seedDatabase };
