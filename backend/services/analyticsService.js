/**
 * analyticsService.js
 *
 * Lightweight analytics for tracking which schemes are viewed and applied for.
 * Stores event counts per scheme per day in MongoDB.
 * No personal data — only scheme slug + event type + date.
 */

const mongoose = require("mongoose");

// ─── Analytics schema ─────────────────────────────────────

const AnalyticsSchema = new mongoose.Schema(
  {
    schemeSlug: { type: String, required: true, index: true },
    event: {
      type: String,
      required: true,
      enum: ["view", "apply_click", "simplify_request", "share"],
    },
    // Bucketed by day for aggregation efficiency
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    count: { type: Number, default: 1 },
    // Optional: category for cross-scheme aggregation
    category: { type: String },
  },
  { timestamps: true }
);

// Compound index for upsert — one doc per (slug, event, date)
AnalyticsSchema.index({ schemeSlug: 1, event: 1, date: 1 }, { unique: true });

const Analytics = mongoose.model("Analytics", AnalyticsSchema);

// ─── Helper ───────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10); // "2025-03-19"
}

// ─── Core track function ──────────────────────────────────

/**
 * Records an analytics event — fire-and-forget (non-blocking).
 * @param {string} schemeSlug
 * @param {"view"|"apply_click"|"simplify_request"|"share"} event
 * @param {string} [category] - scheme category (optional, for aggregation)
 */
async function track(schemeSlug, event, category = null) {
  if (!schemeSlug || !event) return;

  try {
    await Analytics.findOneAndUpdate(
      { schemeSlug, event, date: today() },
      { $inc: { count: 1 }, $set: { category } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Analytics failures must never affect the main request
    // Only log in development
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[analytics] Failed to track ${event} for ${schemeSlug}:`, err.message);
    }
  }
}

// ─── Query functions ──────────────────────────────────────

/**
 * Get total event counts for a specific scheme.
 * @returns {Object} { view, apply_click, simplify_request, share }
 */
async function getSchemeStats(schemeSlug) {
  const docs = await Analytics.find({ schemeSlug });
  const stats = { view: 0, apply_click: 0, simplify_request: 0, share: 0 };
  docs.forEach((d) => {
    if (stats[d.event] !== undefined) stats[d.event] += d.count;
  });
  return stats;
}

/**
 * Get top N most-viewed schemes overall.
 */
async function getTopSchemes(limit = 10) {
  return Analytics.aggregate([
    { $match: { event: "view" } },
    { $group: { _id: "$schemeSlug", totalViews: { $sum: "$count" }, category: { $first: "$category" } } },
    { $sort: { totalViews: -1 } },
    { $limit: limit },
  ]);
}

/**
 * Get daily view trend for the last N days for a scheme.
 */
async function getSchemeTrend(schemeSlug, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().slice(0, 10);

  return Analytics.aggregate([
    { $match: { schemeSlug, event: "view", date: { $gte: startStr } } },
    { $group: { _id: "$date", views: { $sum: "$count" } } },
    { $sort: { _id: 1 } },
  ]);
}

/**
 * Get overall platform stats — total events by type across all schemes.
 */
async function getPlatformStats() {
  return Analytics.aggregate([
    { $group: { _id: "$event", total: { $sum: "$count" } } },
    { $sort: { total: -1 } },
  ]);
}

module.exports = { track, getSchemeStats, getTopSchemes, getSchemeTrend, getPlatformStats };