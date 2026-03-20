const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router();

const Scheme = require("../models/Scheme");
const { simplifyScheme } = require("../services/aiSimplifier");
const { track } = require("../services/analyticsService");
const logger = require("../services/logger");

// ─── Helper ────────────────────────────────────────────────

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// ─── GET /api/schemes ─────────────────────────────────────
// List all active schemes with optional category filter + pagination

router.get(
  "/",
  [
    query("category").optional().isString().trim(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const { category, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const filter = { isActive: true };
      if (category) filter.category = category;

      const [schemes, total] = await Promise.all([
        Scheme.find(filter)
          .select("-simplifiedCache -__v")
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Scheme.countDocuments(filter),
      ]);

      res.json({
        schemes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/schemes/search ──────────────────────────────
// Full-text search across name, description, ministry

router.get(
  "/search",
  [query("q").notEmpty().withMessage("Query parameter q is required").trim()],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const { q } = req.query;
      const schemes = await Scheme.search(q)
        .select("-simplifiedCache -__v")
        .limit(10)
        .lean();

      res.json({ schemes, query: q });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/schemes/categories ─────────────────────────
// Get list of all available categories with counts

router.get("/categories", async (_req, res, next) => {
  try {
    const counts = await Scheme.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ categories: counts });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/schemes/:slug ───────────────────────────────
// Get full scheme details by slug

router.get(
  "/:slug",
  [param("slug").isString().trim().toLowerCase()],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const scheme = await Scheme.findOne({
        slug: req.params.slug,
        isActive: true,
      }).select("-__v");

      if (!scheme) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      // Return without the full simplifiedCache map in the JSON
      const schemeData = scheme.toObject();
      delete schemeData.simplifiedCache;

      // Fire-and-forget view tracking
      track(scheme.slug, "view", scheme.category).catch(() => {});

      res.json({ scheme: schemeData });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/schemes/:slug/simplify ─────────────────────
// Get AI-simplified description for a scheme + profile

router.post(
  "/:slug/simplify",
  [
    param("slug").isString().trim().toLowerCase(),
    body("profile").isObject().withMessage("profile object required"),
    body("profile.age").isInt({ min: 0, max: 120 }),
    body("profile.income").isInt({ min: 0 }),
    body("profile.occupation").isString().notEmpty(),
    body("profile.state").isString().notEmpty(),
    body("profile.category").isString().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      const scheme = await Scheme.findOne({ slug: req.params.slug, isActive: true });
      if (!scheme) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      const { profile, force = false } = req.body;
      const simplified = await simplifyScheme(scheme, profile, force);

      // Fire-and-forget tracking
      track(scheme.slug, "simplify_request", scheme.category).catch(() => {});

      res.json({ simplified, schemeSlug: scheme.slug });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/schemes/:slug (admin) ────────────────────
// Update a scheme (admin use)

router.patch(
  "/:slug",
  [param("slug").isString().trim().toLowerCase()],
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;

      // Prevent changing slug or simplifiedCache via this route
      const forbidden = ["slug", "simplifiedCache", "_id"];
      forbidden.forEach((f) => delete req.body[f]);

      const scheme = await Scheme.findOneAndUpdate(
        { slug: req.params.slug },
        { $set: req.body },
        { new: true, runValidators: true }
      ).select("-__v");

      if (!scheme) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      logger.info(`Scheme updated: ${scheme.slug}`);
      res.json({ scheme });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;