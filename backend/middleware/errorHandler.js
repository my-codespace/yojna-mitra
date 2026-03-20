const logger = require("../services/logger");

/**
 * Central error handler for Express.
 * All routes call next(err) to reach here.
 */
function errorHandler(err, req, res, _next) {
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max size is 10MB." });
  }

  // JWT / auth error (for future auth layer)
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing auth token" });
  }

  // Anthropic API error
  if (err.status && err.error?.type) {
    logger.error("Anthropic API error", { status: err.status, type: err.error.type });
    return res.status(502).json({ error: "AI service temporarily unavailable" });
  }

  // Default 500
  logger.error("Unhandled error", {
    message: err.message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    path: req.path,
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
}

module.exports = { errorHandler };