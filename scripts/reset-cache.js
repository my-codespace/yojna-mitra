#!/usr/bin/env node
/**
 * scripts/reset-cache.js
 *
 * Clears all AI simplification cache from both:
 *   1. The in-memory / Redis cache
 *   2. The simplifiedCache Map field on every Scheme document
 *
 * Use this after updating the simplification prompt or when you
 * want to force fresh AI responses for all schemes.
 *
 * Usage:
 *   node scripts/reset-cache.js              # clear all
 *   node scripts/reset-cache.js --slug pm-kisan  # clear one scheme
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Scheme = require("../backend/models/Scheme");
const cache = require("../backend/services/cacheService");

const args = process.argv.slice(2);
const slugFlag = args.indexOf("--slug");
const targetSlug = slugFlag !== -1 ? args[slugFlag + 1] : null;

async function resetCache() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/yojana_mitra");
  console.log("Connected to MongoDB\n");

  const filter = targetSlug ? { slug: targetSlug } : {};
  const schemes = await Scheme.find(filter);

  if (schemes.length === 0) {
    console.log(targetSlug ? `No scheme found with slug: ${targetSlug}` : "No schemes found.");
    await cleanup();
    return;
  }

  console.log(`Clearing cache for ${schemes.length} scheme${schemes.length > 1 ? "s" : ""}...\n`);

  for (const scheme of schemes) {
    const cacheKeyCount = scheme.simplifiedCache?.size || 0;

    // Clear from Redis/in-memory cache
    await cache.delByPrefix(`${scheme.slug}:`);

    // Clear from MongoDB
    scheme.simplifiedCache = new Map();
    await scheme.save();

    console.log(`  ✅ ${scheme.name} — cleared ${cacheKeyCount} cached entries`);
  }

  console.log(`\n✅ Done! Cache cleared for ${schemes.length} scheme${schemes.length > 1 ? "s" : ""}.`);
  console.log("   New AI simplifications will be generated on next user request.\n");

  await cleanup();
}

async function cleanup() {
  await cache.disconnect();
  await mongoose.connection.close();
}

resetCache().catch((err) => {
  console.error("Cache reset failed:", err.message);
  process.exit(1);
});