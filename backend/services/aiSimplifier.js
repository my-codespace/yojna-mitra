/**
 * aiSimplifier.js
 *
 * Simplifies scheme descriptions using Google Gemini 2.5 Flash
 * via direct REST API fetch — no SDK needed.
 *
 * Uses: https://generativelanguage.googleapis.com/v1beta/models/
 *       gemini-2.5-flash:generateContent
 *
 * Free tier: 5 RPM, 250K TPM, 20 RPD
 * Results cached to conserve the 20 RPD daily quota.
 */

const cache = require("./cacheService");
const logger = require("./logger");

// ─── Core Gemini API call via fetch ───────────────────────

async function callGemini(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set in your .env file");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
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
        logger.info(`Rate limit — waiting ${waitSeconds}s (retry ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitSeconds * 1000));
        continue;
      }

      throw error;
    }
  }
}

// ─── Profile bucket helpers ───────────────────────────────

function getOccupationBucket(occupation) {
  const map = {
    "Farmer": "farmer",
    "Student": "student",
    "Self-employed / Small Business": "business",
    "Salaried (Government)": "salaried",
    "Salaried (Private)": "salaried",
    "Daily Wage / Labour": "labour",
    "Street Vendor": "vendor",
    "Unemployed": "unemployed",
    "Homemaker": "homemaker",
    "Retired": "retired",
  };
  return map[occupation] || "general";
}

function getIncomeBucket(income) {
  if (income <= 100000) return "very-low";
  if (income <= 300000) return "low";
  if (income <= 800000) return "medium";
  return "high";
}

function buildCacheKey(schemeSlug, profile) {
  const occ = getOccupationBucket(profile.occupation);
  const inc = getIncomeBucket(profile.income);
  return `${schemeSlug}:${occ}-${inc}`;
}

// ─── Simplification prompt ────────────────────────────────

function buildPrompt(scheme, profile) {
  return `You are explaining an Indian government welfare scheme to a common citizen.

USER PROFILE:
- Age: ${profile.age} years
- Occupation: ${profile.occupation}
- Annual income: Rs.${profile.income.toLocaleString("en-IN")}
- State: ${profile.state}
- Category: ${profile.category}

SCHEME:
Name: ${scheme.name}
Ministry: ${scheme.ministry}
What it is: ${scheme.whatIsIt}
Key benefits: ${scheme.benefits.slice(0, 3).join(", ")}
How to apply: ${scheme.howToApply.slice(0, 2).join(". ")}

Write a simple explanation for this person:
1. ONE sentence: what this scheme gives them (mention the amount clearly)
2. ONE sentence: whether they likely qualify
3. TWO bullet points: most important documents needed
4. ONE sentence: exactly how to apply (website name or office)

Rules: Class 5 English only. Short sentences. No jargon. Under 100 words total.`;
}

// ─── Main simplification function ─────────────────────────

async function simplifyScheme(scheme, profile, force = false) {
  const cacheKey = buildCacheKey(scheme.slug, profile);

  // Always check cache first — critical to conserve 20 RPD
  if (!force) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.info(`AI simplifier cache hit: ${cacheKey}`);
      return cached;
    }

    if (scheme.simplifiedCache && scheme.simplifiedCache.get(cacheKey)) {
      const dbCached = scheme.simplifiedCache.get(cacheKey);
      await cache.set(cacheKey, dbCached);
      logger.info(`AI simplifier DB cache hit: ${cacheKey}`);
      return dbCached;
    }
  }

  logger.info(`Generating simplification: ${cacheKey}`);

  try {
    const prompt = buildPrompt(scheme, profile);
    const simplified = await callGeminiWithRetry(prompt);

    // Cache to save RPD quota
    await cache.set(cacheKey, simplified);
    scheme.simplifiedCache.set(cacheKey, simplified);
    await scheme.save();

    return simplified;
  } catch (error) {
    logger.error("Gemini simplification failed", { error: error.message, cacheKey });
    // Graceful fallback — plain text
    return (
      `${scheme.shortDescription}\n\n` +
      `Benefits: ${scheme.benefits.slice(0, 2).join(", ")}\n\n` +
      `Apply at: ${scheme.officialLink || "your nearest government office"}`
    );
  }
}

// ─── Batch simplify ───────────────────────────────────────

async function batchSimplify(schemes, profile, concurrency = 2) {
  const results = [];
  for (let i = 0; i < schemes.length; i += concurrency) {
    const batch = schemes.slice(i, i + concurrency);
    const simplified = await Promise.allSettled(
      batch.map((s) => simplifyScheme(s, profile))
    );
    results.push(
      ...simplified.map((r, idx) => ({
        schemeSlug: batch[idx].slug,
        text: r.status === "fulfilled" ? r.value : batch[idx].shortDescription,
      }))
    );
  }
  return results;
}

module.exports = { simplifyScheme, batchSimplify, buildCacheKey };