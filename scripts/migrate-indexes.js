#!/usr/bin/env node
/**
 * scripts/migrate-indexes.js
 *
 * Ensures all MongoDB indexes are created and up to date.
 * Safe to run multiple times — MongoDB is idempotent about index creation.
 *
 * Run after deploying schema changes or on a fresh database:
 *   node scripts/migrate-indexes.js
 *
 * What this creates:
 *   Scheme:    text index (name, nameHindi, shortDescription, ministry)
 *              { isActive: 1 }, { category: 1 }, { slug: 1 } (unique)
 *   UserProfile: { sessionId: 1 } (unique), { createdAt: 1 } (TTL — 90 days)
 *   Analytics:  compound { schemeSlug, event, date } (unique)
 *               { schemeSlug: 1 }, { date: 1 }
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/yojana_mitra";
  await mongoose.connect(uri);
  console.log(`\n📊 Connected to MongoDB: ${uri.replace(/\/\/.*@/, "//<redacted>@")}`);

  const db = mongoose.connection.db;
  const results = { created: [], existing: [], failed: [] };

  async function ensureIndex(collectionName, indexSpec, options = {}) {
    const label = `${collectionName} — ${JSON.stringify(indexSpec)}`;
    try {
      const collection = db.collection(collectionName);
      await collection.createIndex(indexSpec, options);
      results.created.push(label);
      console.log(`  ✅ ${label}`);
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        // IndexOptionsConflict or IndexKeySpecsConflict — index already exists
        results.existing.push(label);
        console.log(`  ⏭️  ${label} (already exists)`);
      } else {
        results.failed.push({ label, error: err.message });
        console.error(`  ❌ ${label}: ${err.message}`);
      }
    }
  }

  console.log("\n── Scheme indexes ────────────────────────────────────");

  // Text search index (weighted)
  await ensureIndex("schemes", {
    name: "text",
    nameHindi: "text",
    shortDescription: "text",
    ministry: "text",
  }, {
    name: "scheme_text_search",
    weights: { name: 10, nameHindi: 8, shortDescription: 5, ministry: 2 },
  });

  await ensureIndex("schemes", { slug: 1 }, { unique: true, name: "scheme_slug_unique" });
  await ensureIndex("schemes", { isActive: 1 }, { name: "scheme_active" });
  await ensureIndex("schemes", { category: 1 }, { name: "scheme_category" });
  await ensureIndex("schemes", { category: 1, isActive: 1 }, { name: "scheme_category_active" });

  console.log("\n── UserProfile indexes ───────────────────────────────");

  await ensureIndex("userprofiles", { sessionId: 1 }, { unique: true, name: "profile_session_unique" });

  // TTL index — auto-delete profiles after 90 days
  await ensureIndex("userprofiles", { createdAt: 1 }, {
    name: "profile_ttl_90d",
    expireAfterSeconds: 90 * 24 * 60 * 60,
  });

  console.log("\n── Analytics indexes ─────────────────────────────────");

  // Compound unique index for upsert operations
  await ensureIndex("analytics", { schemeSlug: 1, event: 1, date: 1 }, {
    unique: true,
    name: "analytics_compound_unique",
  });

  await ensureIndex("analytics", { schemeSlug: 1 }, { name: "analytics_scheme" });
  await ensureIndex("analytics", { event: 1 }, { name: "analytics_event" });
  await ensureIndex("analytics", { date: 1 }, { name: "analytics_date" });

  // Summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`✅ Created:  ${results.created.length}`);
  console.log(`⏭️  Existing: ${results.existing.length}`);
  if (results.failed.length > 0) {
    console.log(`❌ Failed:   ${results.failed.length}`);
    results.failed.forEach(({ label, error }) => console.log(`   • ${label}: ${error}`));
  }
  console.log("═══════════════════════════════════════════════════\n");

  await mongoose.connection.close();

  if (results.failed.length > 0) process.exit(1);
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
}); 