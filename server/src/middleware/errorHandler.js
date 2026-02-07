const logger = require("../utils/logger");

// Error handling middleware
function errorHandler(err, req, res, next) {
  // Log the error
  logger.logError(err, req, "Request error");

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages[0], errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Unexpected file field" });
  }

  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json({ error: "Too many requests, please try again later" });
  }

  // Default error - don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode = err.status || err.statusCode || 500;
  const message = isProduction && statusCode === 500
    ? "Internal server error"
    : err.message || "Internal server error";

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
