const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

const Scheme = require("../models/Scheme");
const { rankSchemes } = require("../services/eligibilityEngine");
const logger = require("../services/logger");

// ─── Validation middleware ────────────────────────────────

const profileValidation = [
  body("age")
    .isInt({ min: 0, max: 120 })
    .withMessage("Age must be between 0 and 120"),
  body("income")
    .isInt({ min: 0 })
    .withMessage("Income must be a non-negative number"),
  body("state")
    .isString()
    .notEmpty()
    .withMessage("State is required"),
  body("category")
    .isIn(["General", "OBC", "SC", "ST", "EWS"])
    .withMessage("Category must be one of: General, OBC, SC, ST, EWS"),
  body("occupation")
    .isString()
    .notEmpty()
    .withMessage("Occupation is required"),
  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other", "Prefer not to say"]),
];

// ─── POST /api/eligibility ────────────────────────────────
// Submit a user profile, get ranked matching schemes

router.post("/", profileValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = {
      age: req.body.age,
      income: req.body.income,
      state: req.body.state,
      category: req.body.category,
      occupation: req.body.occupation,
      gender: req.body.gender || "Prefer not to say",
    };

    const includePartial = req.body.includePartial !== false; // default true

    logger.info("Eligibility check", { occupation: profile.occupation, income: profile.income });

    // Fetch all active schemes
    const schemes = await Scheme.find({ isActive: true })
      .select("-simplifiedCache -__v")
      .lean();

    // Run eligibility engine
    const ranked = rankSchemes(profile, schemes, {
      includeIneligible: includePartial,
      minScore: 0.3,
    });

    // Shape response
    const eligible = ranked
      .filter((r) => r.eligible)
      .map(({ scheme, matchScore, failReasons }) => ({
        ...scheme,
        matchScore,
        failReasons,
        status: "eligible",
      }));

    const partial = ranked
      .filter((r) => !r.eligible && r.matchScore >= 0.3)
      .slice(0, 5) // limit partial matches
      .map(({ scheme, matchScore, failReasons }) => ({
        ...scheme,
        matchScore,
        failReasons,
        status: "partial",
      }));

    res.json({
      profile,
      eligible,
      partial,
      totalChecked: schemes.length,
      eligibleCount: eligible.length,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/eligibility/check ─────────────────────────
// Check eligibility for a single scheme

router.post("/check", [...profileValidation, body("schemeSlug").isString().notEmpty()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { schemeSlug, age, income, state, category, occupation, gender } = req.body;
    const profile = { age, income, state, category, occupation, gender: gender || "Prefer not to say" };

    const scheme = await Scheme.findOne({ slug: schemeSlug, isActive: true })
      .select("eligibilityRules name slug")
      .lean();

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const { evaluateEligibility } = require("../services/eligibilityEngine");
    const result = evaluateEligibility(profile, scheme.eligibilityRules);

    res.json({
      schemeSlug: scheme.slug,
      schemeName: scheme.name,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;