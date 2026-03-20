/**
 * ingest.js
 *
 * Orchestrates the full PDF ingestion pipeline:
 *   1. Extract text from PDF (text-layer or OCR)
 *   2. Structure the text into a Scheme JSON (via Claude)
 *   3. Validate the structured data
 *   4. Upsert into MongoDB
 *
 * Can be used programmatically (from Express route) or as CLI:
 *   node pipeline/ingest.js path/to/scheme.pdf
 */

require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

const { extractText } = require("./pdfExtract");
const { structureScheme, validateStructuredScheme } = require("./aiStructure");
const Scheme = require("../backend/models/Scheme");

// ─── Core ingest function ─────────────────────────────────

/**
 * @param {string} pdfPath   - absolute path to the PDF file
 * @param {string} filename  - original filename (for context)
 * @returns {Promise<Object>} the saved Mongoose Scheme document
 */
async function ingestPDF(pdfPath, filename) {
  console.log(`\n📄 Starting ingestion: ${filename}`);

  // Step 1: Extract text
  console.log("  [1/4] Extracting text from PDF...");
  const { text, method } = await extractText(pdfPath);
  console.log(`  ✓ Extracted ${text.length} characters via ${method}`);

  if (text.length < 100) {
    throw new Error("Extracted text is too short — PDF may be blank or unsupported");
  }

  // Step 2: Structure via AI
  console.log("  [2/4] Structuring with Claude AI...");
  const structured = await structureScheme(text, filename);
  console.log(`  ✓ Structured as: "${structured.name}" [${structured.category}]`);

  // Step 3: Validate
  console.log("  [3/4] Validating structured data...");
  const errors = validateStructuredScheme(structured);
  if (errors.length > 0) {
    throw new Error(`Validation errors:\n  - ${errors.join("\n  - ")}`);
  }
  console.log("  ✓ Validation passed");

  // Step 4: Upsert to MongoDB
  console.log("  [4/4] Saving to database...");
  const schemeData = {
    ...structured,
    sourceDocument: filename,
    isActive: true,
    simplifiedCache: new Map(),
  };

  const scheme = await Scheme.findOneAndUpdate(
    { slug: structured.slug },
    { $set: schemeData },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`  ✓ Saved: ${scheme.name} (${scheme._id})`);
  console.log(`\n✅ Ingestion complete!\n`);

  return scheme;
}

// ─── CLI entry point ──────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node pipeline/ingest.js <path-to-pdf> [<path-to-pdf2> ...]");
    process.exit(1);
  }

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/yojana_mitra");
  console.log("Connected to MongoDB");

  const results = { success: [], failed: [] };

  for (const pdfPath of args) {
    const absPath = path.resolve(pdfPath);
    const filename = path.basename(pdfPath);

    try {
      await ingestPDF(absPath, filename);
      results.success.push(filename);
    } catch (err) {
      console.error(`\n❌ Failed to ingest ${filename}:`, err.message);
      results.failed.push({ filename, error: err.message });
    }
  }

  // Summary
  console.log("\n═══════════════════════════════");
  console.log(`📊 Summary: ${results.success.length} succeeded, ${results.failed.length} failed`);
  if (results.success.length > 0) {
    console.log("  Succeeded:", results.success.join(", "));
  }
  if (results.failed.length > 0) {
    console.log("  Failed:");
    results.failed.forEach(({ filename, error }) => console.log(`    • ${filename}: ${error}`));
  }

  await mongoose.connection.close();
}

// Run as CLI if invoked directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
  });
}

module.exports = { ingestPDF };