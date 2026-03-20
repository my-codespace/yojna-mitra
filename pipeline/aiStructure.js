/**
 * aiStructure.js
 *
 * Converts raw PDF text into structured Scheme JSON using
 * Google Gemini via direct REST API fetch — no SDK needed.
 *
 * Uses: https://generativelanguage.googleapis.com/v1beta/models/
 *       gemini-2.5-flash:generateContent
 *
 * No npm packages beyond what's already installed.
 * Set GOOGLE_API_KEY in your .env file.
 */

// ─── Smart text truncation ────────────────────────────────

function smartTruncate(text, maxChars = 3000) {
  if (text.length <= maxChars) return text;
  const start = text.slice(0, 2000);
  const midPoint = Math.floor(text.length / 2);
  const middle = text.slice(midPoint - 500, midPoint + 500);
  return `${start}\n\n[...document continues...]\n\n${middle}`;
}

// ─── Core Gemini API call via fetch ───────────────────────

async function callGemini(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set in your .env file");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── Retry with backoff on 429 ────────────────────────────

async function callGeminiWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callGemini(prompt);
    } catch (error) {
      const msg = error.message || "";
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");

      if (is429 && attempt < maxRetries) {
        const retryMatch = msg.match(/retryDelay['":\s]+(\d+)/);
        const waitSeconds = retryMatch ? parseInt(retryMatch[1]) + 2 : 20 * attempt;
        console.log(`  ⏳ Rate limit — waiting ${waitSeconds}s (retry ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, waitSeconds * 1000));
        continue;
      }

      if (is429) {
        throw new Error(
          `Gemini rate limit hit after ${maxRetries} attempts.\n` +
          `Free tier: 5 requests/min, 20 requests/day.\n` +
          `Wait a minute (or until tomorrow) and try again.\n` +
          `Check usage: https://ai.dev/rate-limit`
        );
      }

      throw error;
    }
  }
}

// ─── Prompt builder ───────────────────────────────────────

function buildStructuringPrompt(rawText, filename) {
  const truncated = smartTruncate(rawText, 3000);

  return `You are a data extraction expert for Indian government scheme documents.

Extract information from this government scheme document.
Filename: ${filename}

DOCUMENT TEXT:
---
${truncated}
---

Return ONLY a valid JSON object (no markdown, no explanation, no code fences) with this structure:

{
  "slug": "kebab-case-scheme-name",
  "name": "Full Official Scheme Name",
  "nameHindi": "Hindi name if mentioned, else null",
  "tagline": "One sentence summary of core benefit",
  "category": "one of: farmer|student|housing|health|women|labour|business|pension|vendor|general",
  "ministry": "Full ministry name",
  "icon": "single relevant emoji",
  "shortDescription": "2-3 sentences max 250 chars",
  "whatIsIt": "Simple paragraph explaining the scheme",
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "documents": ["document 1", "document 2"],
  "howToApply": ["step 1", "step 2", "step 3"],
  "eligibilityRules": {
    "logic": "AND",
    "conditions": [
      {
        "field": "age|income|state|category|occupation|gender",
        "operator": "eq|ne|lt|lte|gt|gte|in|nin|range",
        "value": "number, string, or array",
        "label": "human readable description"
      }
    ]
  },
  "eligibilityText": "Plain English summary of who can apply",
  "officialLink": "https://... if mentioned",
  "applyLink": "https://... if different"
}

Rules:
- income: annual INR as number (200000 = Rs.2 lakh)
- age range: operator "range", value [min, max]
- "in" operator: value must be an array e.g. ["SC","ST"]
- occupation values: Farmer|Student|Self-employed / Small Business|Salaried (Government)|Salaried (Private)|Daily Wage / Labour|Street Vendor|Unemployed|Homemaker|Retired
- category values: General|OBC|SC|ST|EWS
- Return ONLY valid JSON, nothing else`;
}

// ─── Main structuring function ────────────────────────────

// ─── JSON repair for truncated responses ─────────────────
// Gemini sometimes cuts off mid-response when output is long.
// This function closes any open strings/brackets so JSON.parse works.

function repairJson(raw) {
  let s = raw.trim();

  // Remove markdown fences
  s = s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  // If it already parses cleanly, return immediately
  try { JSON.parse(s); return s; } catch {}

  // Walk the string tracking open structures
  let inString = false;
  let escaped = false;
  const stack = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') {
      inString = !inString;
    } else if (!inString) {
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
  }

  // Close any open string first
  if (inString) s += '"';

  // Remove trailing comma before closing
  s = s.replace(/,\s*$/, "");

  // Close all open brackets/braces in reverse
  while (stack.length) s += stack.pop();

  return s;
}

async function structureScheme(rawText, filename) {
  const prompt = buildStructuringPrompt(rawText, filename);
  const rawJson = await callGeminiWithRetry(prompt);

  // Attempt to repair truncated or fenced JSON
  const clean = repairJson(rawJson);

  let structured;
  try {
    structured = JSON.parse(clean);
  } catch (err) {
    throw new Error(
      `Model returned invalid JSON: ${err.message}\n\nRaw:\n${rawJson.slice(0, 500)}`
    );
  }

  const required = ["slug", "name", "category", "ministry", "eligibilityRules"];
  const missing = required.filter((f) => !structured[f]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  return structured;
}

// ─── Validation helper ─────────────────────────────────────

function validateStructuredScheme(data) {
  const errors = [];
  if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push("slug must be lowercase kebab-case");
  }
  if (!data.name || data.name.length < 5) {
    errors.push("name is too short");
  }
  const validCategories = [
    "farmer","student","housing","health","women",
    "labour","business","pension","vendor","general",
  ];
  if (!validCategories.includes(data.category)) {
    errors.push(`category '${data.category}' is invalid`);
  }
  if (!data.eligibilityRules?.conditions?.length) {
    errors.push("eligibilityRules must have at least one condition");
  }
  return errors;
}

module.exports = { structureScheme, validateStructuredScheme };