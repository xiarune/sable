#!/usr/bin/env node
/**
 * Create Admin Account Script
 *
 * Usage:
 *   node src/scripts/createAdmin.js --username admin --email admin@sable.com --password YourSecurePassword123
 *
 * Or interactive:
 *   node src/scripts/createAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const Admin = require("../models/Admin");

const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/sable";
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    console.log("Connected to MongoDB\n");

    // Get credentials
    let username = getArg("username");
    let email = getArg("email");
    let password = getArg("password");
    let displayName = getArg("displayName");

    if (!username) {
      username = await prompt("Username: ");
    }
    if (!email) {
      email = await prompt("Email: ");
    }
    if (!password) {
      password = await prompt("Password: ");
    }
    if (!displayName) {
      displayName = await prompt("Display Name (optional, press Enter to skip): ");
    }

    // Validate
    if (!username || username.length < 3) {
      console.error("Error: Username must be at least 3 characters");
      process.exit(1);
    }
    if (!email || !email.includes("@")) {
      console.error("Error: Invalid email address");
      process.exit(1);
    }
    if (!password || password.length < 8) {
      console.error("Error: Password must be at least 8 characters");
      process.exit(1);
    }

    // Check if already exists
    const existing = await Admin.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });

    if (existing) {
      console.error("Error: An admin with this username or email already exists");
      process.exit(1);
    }

    // Create admin
    const admin = new Admin({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: displayName || undefined,
      role: "admin",
      isActive: true,
    });

    await admin.setPassword(password);
    await admin.save();

    console.log("\n✓ Admin account created successfully!");
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`\nYou can now log in at /admin/login`);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
