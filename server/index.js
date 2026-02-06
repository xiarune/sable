require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Missing MONGO_URI in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection failed:");
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
