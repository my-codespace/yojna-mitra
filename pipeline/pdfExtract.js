/**
 * pdfExtract.js
 *
 * Extracts raw text from a PDF file.
 * Strategy:
 *   1. Try pdf-parse (fast, works on text-layer PDFs)
 *   2. If extracted text < 100 chars (scanned PDF), fall back to Tesseract OCR
 *      — converts PDF pages to images using `pdftoppm` then runs Tesseract
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawnSync } = require("child_process");

// ─── Text-layer extraction ────────────────────────────────

async function extractWithPdfParse(pdfPath) {
  try {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (err) {
    console.warn("pdf-parse failed:", err.message);
    return "";
  }
}

// ─── OCR extraction (scanned PDFs) ───────────────────────

async function extractWithOCR(pdfPath) {
  const { createWorker } = require("tesseract.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yojana-ocr-"));

  try {
    // Convert PDF pages to PNG images using pdftoppm (poppler-utils)
    // Requires: apt-get install poppler-utils
    const result = spawnSync("pdftoppm", ["-r", "150", "-png", pdfPath, path.join(tmpDir, "page")]);
    if (result.status !== 0) {
      throw new Error("pdftoppm failed — is poppler-utils installed?");
    }

    // Get all generated page images
    const images = fs.readdirSync(tmpDir)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => path.join(tmpDir, f));

    if (images.length === 0) throw new Error("No pages extracted from PDF");

    // Limit to first 5 pages to avoid token explosion
    const pagesToProcess = images.slice(0, 5);

    // Run Tesseract OCR on each page
    const worker = await createWorker("eng+hin"); // English + Hindi
    let fullText = "";

    for (const imagePath of pagesToProcess) {
      const { data: { text } } = await worker.recognize(imagePath);
      fullText += text + "\n\n";
    }

    await worker.terminate();
    return fullText.trim();
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

// ─── Main extract function ────────────────────────────────

/**
 * Extracts text from a PDF, trying text-layer first then OCR.
 * @param {string} pdfPath - absolute path to PDF file
 * @returns {Promise<{ text: string, method: "pdf-parse" | "ocr" }>}
 */
async function extractText(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  // Try text layer first
  const textLayerResult = await extractWithPdfParse(pdfPath);

  if (textLayerResult.length > 200) {
    return { text: textLayerResult, method: "pdf-parse" };
  }

  console.log(`Text layer too short (${textLayerResult.length} chars), trying OCR...`);

  // Fall back to OCR
  const ocrText = await extractWithOCR(pdfPath);
  return { text: ocrText, method: "ocr" };
}

module.exports = { extractText };