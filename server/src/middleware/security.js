const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

// Helmet security headers
const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Disable CSP for now (can be configured later)
  crossOriginEmbedderPolicy: false, // Allow embedding
});

// Sanitize request data to prevent NoSQL injection
// Removes any keys that start with $ or contain .
// Only sanitize body to avoid read-only property issues
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  }
  next();
};

// XSS protection - basic sanitization for string inputs
function xssSanitize(obj) {
  if (typeof obj === "string") {
    // Remove script tags and other dangerous HTML
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }
  if (Array.isArray(obj)) {
    return obj.map(xssSanitize);
  }
  if (obj && typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = xssSanitize(value);
    }
    return sanitized;
  }
  return obj;
}

const xssMiddleware = (req, res, next) => {
  // Only sanitize body - query and params are read-only getters in Express
  if (req.body && typeof req.body === "object") {
    req.body = xssSanitize(req.body);
  }
  next();
};

module.exports = {
  helmetMiddleware,
  sanitizeMiddleware,
  xssMiddleware,
};
