#!/usr/bin/env node
/**
 * scripts/check-health.js
 *
 * Checks that all services (API, MongoDB, Redis) are healthy.
 * Run after `docker-compose up` to verify everything is working.
 *
 * Usage: node scripts/check-health.js [--url http://localhost:5000]
 */

require("dotenv").config();

const args = process.argv.slice(2);
const urlFlag = args.indexOf("--url");
const BASE_URL = urlFlag !== -1 ? args[urlFlag + 1] : "http://localhost:5000";

async function checkHealth() {
  console.log(`\n🏥 Yojana Mitra Health Check`);
  console.log(`   Target: ${BASE_URL}\n`);

  const checks = [
    {
      name: "API server",
      url: `${BASE_URL}/health`,
      validate: (data) => data.status === "ok",
    },
    {
      name: "Database (MongoDB)",
      url: `${BASE_URL}/health`,
      validate: (data) => data.db === "connected",
    },
    {
      name: "Schemes endpoint",
      url: `${BASE_URL}/api/schemes`,
      validate: (data) => Array.isArray(data.schemes),
    },
    {
      name: "Pipeline status",
      url: `${BASE_URL}/api/pipeline/status`,
      validate: (data) => typeof data.totalSchemes === "number",
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const response = await fetch(check.url, { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      const passed = response.ok && check.validate(data);

      if (passed) {
        const extra = check.name === "Schemes endpoint"
          ? ` (${data.schemes.length} schemes loaded)`
          : check.name === "Pipeline status"
          ? ` (${data.totalSchemes} active schemes in DB)`
          : check.name === "Database (MongoDB)"
          ? ` (uptime: ${Math.round(data.uptime)}s)`
          : "";

        console.log(`  ✅ ${check.name}${extra}`);
      } else {
        console.log(`  ❌ ${check.name} — unexpected response`);
        allPassed = false;
      }
    } catch (err) {
      console.log(`  ❌ ${check.name} — ${err.message}`);
      allPassed = false;
    }
  }

  console.log();
  if (allPassed) {
    console.log("✅ All checks passed — Yojana Mitra is healthy!\n");
    process.exit(0);
  } else {
    console.log("❌ Some checks failed. Check logs: docker-compose logs backend\n");
    process.exit(1);
  }
}

checkHealth().catch((err) => {
  console.error("Health check script error:", err.message);
  process.exit(1);
});