const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const { ingestPDF } = require("../../pipeline/ingest");
const Scheme = require("../models/Scheme");
const logger = require("../services/logger");
const { adminAuth } = require("../middleware/adminAuth");

// ─── Multer config ─────────────────────────────────────────

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || "./uploads",
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_PDF_SIZE_MB) || 10) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

// ─── POST /api/pipeline/ingest (admin only) ───────────────
// Upload a PDF, extract and structure scheme data via AI

router.post("/ingest", adminAuth, upload.single("pdf"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: "PDF file is required" });
  }

  try {
    logger.info(`Pipeline: ingesting ${req.file.filename}`);

    const result = await ingestPDF(req.file.path, req.file.originalname);

    res.status(201).json({
      message: "Scheme ingested successfully",
      scheme: {
        slug: result.slug,
        name: result.name,
        category: result.category,
      },
    });
  } catch (err) {
    logger.error("Pipeline ingest failed", { error: err.message, file: req.file?.filename });
    next(err);
  }
});

// ─── GET /api/pipeline/status (public) ────────────────────
// Count schemes + confirm pipeline is healthy

router.get("/status", async (_req, res, next) => {
  try {
    const total = await Scheme.countDocuments({ isActive: true });
    const byCategory = await Scheme.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ totalSchemes: total, byCategory });
  } catch (err) {
    next(err);
  }
});

module.exports = router;