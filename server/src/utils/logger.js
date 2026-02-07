const winston = require("winston");
const path = require("path");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === "production") {
  const logsDir = process.env.LOGS_DIR || path.join(__dirname, "../../logs");

  // Error log file
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Helper methods for common logging patterns
logger.logRequest = (req, message = "Request received") => {
  logger.info(message, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?._id,
  });
};

logger.logError = (err, req = null, message = "Error occurred") => {
  const meta = {
    error: err.message,
    stack: err.stack,
  };

  if (req) {
    meta.method = req.method;
    meta.path = req.path;
    meta.ip = req.ip;
    meta.userId = req.user?._id;
  }

  logger.error(message, meta);
};

logger.logAuth = (action, userId, success, ip) => {
  const level = success ? "info" : "warn";
  logger[level](`Auth: ${action}`, { userId, success, ip });
};

module.exports = logger;
