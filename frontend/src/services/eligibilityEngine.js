/**
 * eligibilityEngine.js (client-side)
 *
 * Mirrors the backend rule evaluator so the wizard can show
 * live eligibility feedback without a network round-trip.
 * The backend is the source of truth — this is for UX only.
 */

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

function formatINR(n) {
  if (typeof n === "number" && n >= 1000) return `₹${n.toLocaleString("en-IN")}`;
  return String(n);
}

function failReason(field, operator, value, actual) {
  const v = Array.isArray(value) ? value.join(" or ") : formatINR(value);
  const a = formatINR(actual);
  switch (operator) {
    case "lte":   return `${field} must be ≤ ${v} (yours: ${a})`;
    case "gte":   return `${field} must be ≥ ${v} (yours: ${a})`;
    case "eq":    return `${field} must be ${v} (yours: ${a})`;
    case "in":    return `${field} must be one of: ${v} (yours: ${a})`;
    case "range": return `${field} must be ${formatINR(value[0])}–${formatINR(value[1])} (yours: ${a})`;
    default:      return `${field} condition not met`;
  }
}

export function evaluateEligibility(profile, rules) {
  if (!rules?.conditions?.length) return { eligible: true, matchScore: 1, failReasons: [] };

  const { logic = "AND", conditions } = rules;
  const results = conditions.map((c) => {
    const actual = profile[c.field];
    if (actual === undefined || actual === null) return { pass: false, reason: `${c.field} not provided` };
    const evaluator = OPERATORS[c.operator];
    const pass = evaluator ? evaluator(actual, c.value) : false;
    return { pass, reason: pass ? null : failReason(c.field, c.operator, c.value, actual) };
  });

  const passed = results.filter((r) => r.pass).length;
  const total = conditions.length;
  const eligible = logic === "OR" ? passed > 0 : passed === total;

  return {
    eligible,
    matchScore: passed / total,
    passedCount: passed,
    totalCount: total,
    failReasons: results.filter((r) => !r.pass).map((r) => r.reason),
  };
}

export function rankSchemes(profile, schemes) {
  return schemes
    .map((scheme) => ({ scheme, ...evaluateEligibility(profile, scheme.eligibilityRules) }))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.matchScore - a.matchScore;
    });
}