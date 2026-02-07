const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const passport = require("passport");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { configurePassport } = require("./config/passport");
const { apiLimiter } = require("./middleware/rateLimiter");
const { helmetMiddleware, sanitizeMiddleware, xssMiddleware } = require("./middleware/security");
const logger = require("./utils/logger");

function createApp() {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmetMiddleware);

  // Logging with Morgan (stream to Winston in production)
  if (process.env.NODE_ENV === "production") {
    app.use(
      morgan("combined", {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );
  } else {
    app.use(morgan("dev"));
  }

  // Body parsing
  app.use(express.json({ limit: "2mb" }));

  // Cookies (for auth)
  app.use(cookieParser());

  // Input sanitization (NoSQL injection and XSS protection)
  app.use(sanitizeMiddleware);
  app.use(xssMiddleware);

  // CORS (React dev server)
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  app.use(
    cors({
      origin,
      credentials: true,
    })
  );

  // Rate limiting for API routes
  app.use("/api", apiLimiter);

  // Passport (Google OAuth)
  configurePassport();
  app.use(passport.initialize());

  // Health check
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  // API routes
  app.use("/api", routes);

  // Error handling
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
