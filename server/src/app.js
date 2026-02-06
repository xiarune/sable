const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const passport = require("passport");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { configurePassport } = require("./config/passport");

function createApp() {
  const app = express();

  // Logging
  app.use(morgan("dev"));

  // Body parsing
  app.use(express.json({ limit: "2mb" }));

  // Cookies (for auth)
  app.use(cookieParser());

  // CORS (React dev server)
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  app.use(
    cors({
      origin,
      credentials: true,
    })
  );

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
