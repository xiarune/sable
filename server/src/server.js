require("dotenv").config();

const { createApp } = require("./app");
const { connectDB } = require("./config/db");

// Register all models
require("./models");

async function start() {
  const app = createApp();

  const port = process.env.PORT || 5000;

  try {
    await connectDB(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas");
    console.log("✅ Models registered: User, Draft, Work, Upload");

    app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Server failed to start:");
    console.error(err.message || err);
    process.exit(1);
  }
}

start();
