#!/usr/bin/env node
/**
 * scripts/generate-admin-key.js
 *
 * Generates a cryptographically secure admin API key.
 * Paste the output into your .env file as ADMIN_API_KEY.
 *
 * Usage: node scripts/generate-admin-key.js
 */

const crypto = require("crypto");

const key = crypto.randomBytes(32).toString("hex");

console.log("\n🔑 Generated Admin API Key:");
console.log("─".repeat(68));
console.log(key);
console.log("─".repeat(68));
console.log("\nAdd to your .env file:");
console.log(`ADMIN_API_KEY=${key}`);
console.log("\nAnd set in docker-compose or hosting environment.");
console.log("Keep this secret — it grants access to the PDF ingestion pipeline.\n");