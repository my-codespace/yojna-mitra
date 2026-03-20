/**
 * adminAuth.js
 *
 * Simple API-key based authentication for admin/pipeline routes.
 * Set ADMIN_API_KEY in .env. Pass it as:
 *   Header:  X-Admin-Key: your-key
 *   Or query: ?adminKey=your-key  (not recommended for production)
 *
 * In development, if ADMIN_API_KEY is not set, all requests pass through
 * with a warning. In production, unkeyed requests are always rejected.
 */

const logger = require("../services/logger");

function adminAuth(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;

  // Development fallback — warn but allow if no key configured
  if (!adminKey) {
    if (process.env.NODE_ENV === "production") {
      logger.error("ADMIN_API_KEY not set in production — blocking admin request");
      return res.status(503).json({
        error: "Admin routes not configured. Set ADMIN_API_KEY environment variable.",
      });
    }
    logger.warn("ADMIN_API_KEY not set — admin request allowed in dev mode");
    return next();
  }

  // Check header first, then query param
  const provided =
    req.headers["x-admin-key"] ||
    req.query.adminKey;

  if (!provided || provided !== adminKey) {
    logger.warn("Unauthorized admin request", { ip: req.ip, path: req.path });
    return res.status(401).json({ error: "Unauthorized — invalid or missing admin key" });
  }

  next();
}

module.exports = { adminAuth };