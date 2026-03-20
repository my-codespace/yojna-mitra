const express = require("express");
const { param, query, validationResult } = require("express-validator");
const router = express.Router();

const {
  getSchemeStats,
  getTopSchemes,
  getSchemeTrend,
  getPlatformStats,
  track,
} = require("../services/analyticsService");

// ─── POST /api/analytics/track ────────────────────────────
// Client-side tracking endpoint (fire-and-forget)

router.post("/track", async (req, res) => {
  const { schemeSlug, event, category } = req.body;
  const validEvents = ["view", "apply_click", "simplify_request", "share"];

  if (!schemeSlug || !validEvents.includes(event)) {
    return res.status(400).json({ error: "Invalid schemeSlug or event" });
  }

  // Respond immediately — don't await tracking
  res.json({ ok: true });

  // Track asynchronously
  track(schemeSlug, event, category).catch(() => {});
});

// ─── GET /api/analytics/top ──────────────────────────────
// Top viewed schemes

router.get(
  "/top",
  [query("limit").optional().isInt({ min: 1, max: 50 }).toInt()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const top = await getTopSchemes(req.query.limit || 10);
      res.json({ schemes: top });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/analytics/platform ─────────────────────────
// Overall platform event totals

router.get("/platform", async (_req, res, next) => {
  try {
    const stats = await getPlatformStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/schemes/:slug ────────────────────
// Stats for a single scheme

router.get(
  "/schemes/:slug",
  [param("slug").isString().trim()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const [stats, trend] = await Promise.all([
        getSchemeStats(req.params.slug),
        getSchemeTrend(req.params.slug, 30),
      ]);

      res.json({ schemeSlug: req.params.slug, stats, trend });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;