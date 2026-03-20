require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const logger = require("./services/logger");
const schemesRouter = require("./routes/schemes");
const usersRouter = require("./routes/users");
const eligibilityRouter = require("./routes/eligibility");
const pipelineRouter = require("./routes/pipeline");
const analyticsRouter = require("./routes/analytics");
const { errorHandler } = require("./middleware/errorHandler");
const { adminAuth } = require("./middleware/adminAuth");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure upload directory exists ───────────────────────
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ─── Security middleware ───────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ─── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ─── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ───────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { query: req.query });
  next();
});

// ─── Routes ────────────────────────────────────────────────
app.use("/api/schemes", schemesRouter);
app.use("/api/users", usersRouter);
app.use("/api/eligibility", eligibilityRouter);
app.use("/api/pipeline", pipelineRouter);          // auth applied per-route inside router
app.use("/api/analytics", analyticsRouter);            // reads open, writes checked per-route

// ─── Health check ──────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ─── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ─── MongoDB connection + server start ────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/yojana_mitra")
  .then(() => {
    logger.info("MongoDB connected");
    app.listen(PORT, () => {
      logger.info(`Yojana Mitra API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed", { error: err.message });
    process.exit(1);
  });

// ─── Graceful shutdown ────────────────────────────────────
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  const cache = require("./services/cacheService");
  await cache.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app; // for testing