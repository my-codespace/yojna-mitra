/**
 * eligibilityEngine.js
 *
 * Pure function rule evaluator — no I/O, fully testable.
 *
 * Supported operators:
 *   eq, ne, lt, lte, gt, gte   → numeric / string comparison
 *   in, nin                    → array membership
 *   range                      → [min, max] inclusive
 *
 * Each condition returns { pass, reason } so failed reasons
 * can be surfaced to the user ("Income exceeds ₹2L limit").
 */

// ─── Operator evaluators ───────────────────────────────────

const OPERATORS = {
  eq:    (a, b) => a === b,
  ne:    (a, b) => a !== b,
  lt:    (a, b) => a < b,
  lte:   (a, b) => a <= b,
  gt:    (a, b) => a > b,
  gte:   (a, b) => a >= b,
  in:    (a, b) => Array.isArray(b) && b.includes(a),
  nin:   (a, b) => Array.isArray(b) && !b.includes(a),
  range: (a, b) => Array.isArray(b) && b.length === 2 && a >= b[0] && a <= b[1],
};

// ─── Field label helpers ───────────────────────────────────

function formatValue(value) {
  if (Array.isArray(value)) return value.join(" or ");
  if (typeof value === "number" && value >= 10000) {
    return `₹${value.toLocaleString("en-IN")}`;
  }
  return String(value);
}

function buildFailReason(field, operator, value, actual) {
  const fmtVal = formatValue(value);
  const fmtActual =
    typeof actual === "number" && actual >= 10000
      ? `₹${actual.toLocaleString("en-IN")}`
      : String(actual);

  switch (operator) {
    case "eq":    return `${field} must be ${fmtVal} (yours: ${fmtActual})`;
    case "ne":    return `${field} must not be ${fmtVal}`;
    case "lt":    return `${field} must be below ${fmtVal} (yours: ${fmtActual})`;
    case "lte":   return `${field} must be at most ${fmtVal} (yours: ${fmtActual})`;
    case "gt":    return `${field} must be above ${fmtVal} (yours: ${fmtActual})`;
    case "gte":   return `${field} must be at least ${fmtVal} (yours: ${fmtActual})`;
    case "in":    return `${field} must be one of: ${fmtVal} (yours: ${fmtActual})`;
    case "nin":   return `${field} must not be: ${fmtVal}`;
    case "range": return `${field} must be between ${formatValue(value[0])} and ${formatValue(value[1])} (yours: ${fmtActual})`;
    default:      return `${field} condition not met`;
  }
}

// ─── Single condition evaluator ───────────────────────────

function evaluateCondition(profile, condition) {
  const { field, operator, value } = condition;
  const actual = profile[field];

  // Missing field in profile = cannot evaluate = treat as fail
  if (actual === undefined || actual === null) {
    return {
      pass: false,
      reason: `${field} information not provided`,
    };
  }

  const evaluator = OPERATORS[operator];
  if (!evaluator) {
    return { pass: false, reason: `Unknown operator: ${operator}` };
  }

  const pass = evaluator(actual, value);
  return {
    pass,
    reason: pass ? null : buildFailReason(field, operator, value, actual),
  };
}

// ─── Full scheme eligibility check ────────────────────────

/**
 * @param {Object} profile - user profile { age, income, state, category, occupation, gender }
 * @param {Object} rules   - { logic: "AND"|"OR", conditions: [...] }
 * @returns {Object} { eligible, matchScore, passedCount, totalCount, failReasons }
 */
function evaluateEligibility(profile, rules) {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return { eligible: true, matchScore: 1, passedCount: 0, totalCount: 0, failReasons: [] };
  }

  const { logic = "AND", conditions } = rules;
  const results = conditions.map((c) => evaluateCondition(profile, c));

  const passedCount = results.filter((r) => r.pass).length;
  const totalCount = conditions.length;
  const matchScore = passedCount / totalCount;
  const failReasons = results.filter((r) => !r.pass).map((r) => r.reason);

  let eligible;
  if (logic === "OR") {
    eligible = passedCount > 0;
  } else {
    eligible = passedCount === totalCount;
  }

  return { eligible, matchScore, passedCount, totalCount, failReasons };
}

// ─── Batch: score all schemes for a profile ───────────────

/**
 * @param {Object}   profile - user profile
 * @param {Array}    schemes - array of scheme documents
 * @param {Object}   options - { includeIneligible, minScore }
 * @returns {Array}  sorted by matchScore descending
 */
function rankSchemes(profile, schemes, options = {}) {
  const { includeIneligible = false, minScore = 0 } = options;

  const results = schemes
    .map((scheme) => {
      const result = evaluateEligibility(profile, scheme.eligibilityRules);
      return {
        scheme,
        ...result,
      };
    })
    .filter((r) => {
      if (!includeIneligible && !r.eligible) return false;
      if (r.matchScore < minScore) return false;
      return true;
    })
    .sort((a, b) => {
      // Eligible first, then by match score
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.matchScore - a.matchScore;
    });

  return results;
}

module.exports = { evaluateEligibility, rankSchemes, evaluateCondition };