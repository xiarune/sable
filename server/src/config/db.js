const mongoose = require("mongoose");

async function connectDB(mongoUri) {
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to server/.env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectDB };
