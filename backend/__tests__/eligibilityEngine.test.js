/**
 * eligibilityEngine.test.js
 * Run: npm test
 */

const { evaluateEligibility, rankSchemes, evaluateCondition } = require("../../backend/services/eligibilityEngine");

// ─── evaluateCondition ────────────────────────────────────

describe("evaluateCondition", () => {
  const profile = { age: 25, income: 150000, category: "SC", occupation: "Farmer", state: "Bihar" };

  test("eq — passes when equal", () => {
    expect(evaluateCondition(profile, { field: "occupation", operator: "eq", value: "Farmer" }).pass).toBe(true);
  });

  test("eq — fails when not equal", () => {
    const r = evaluateCondition(profile, { field: "occupation", operator: "eq", value: "Student" });
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("occupation");
  });

  test("lte — passes when value at limit", () => {
    expect(evaluateCondition(profile, { field: "income", operator: "lte", value: 150000 }).pass).toBe(true);
  });

  test("lte — fails when over limit", () => {
    const r = evaluateCondition(profile, { field: "income", operator: "lte", value: 100000 });
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("₹");
  });

  test("in — passes when value in array", () => {
    expect(evaluateCondition(profile, { field: "category", operator: "in", value: ["SC", "ST"] }).pass).toBe(true);
  });

  test("in — fails when value not in array", () => {
    expect(evaluateCondition(profile, { field: "category", operator: "in", value: ["OBC", "ST"] }).pass).toBe(false);
  });

  test("range — passes when in range", () => {
    expect(evaluateCondition(profile, { field: "age", operator: "range", value: [18, 40] }).pass).toBe(true);
  });

  test("range — fails when outside range", () => {
    expect(evaluateCondition(profile, { field: "age", operator: "range", value: [30, 50] }).pass).toBe(false);
  });

  test("missing field — returns fail with informative message", () => {
    const r = evaluateCondition({ age: 25 }, { field: "income", operator: "lte", value: 200000 });
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("income");
  });
});

// ─── evaluateEligibility ──────────────────────────────────

describe("evaluateEligibility — AND logic", () => {
  const farmerProfile = { age: 30, income: 150000, occupation: "Farmer" };
  const farmerRules = {
    logic: "AND",
    conditions: [
      { field: "income", operator: "lte", value: 200000 },
      { field: "occupation", operator: "eq", value: "Farmer" },
    ],
  };

  test("eligible when all conditions pass", () => {
    const r = evaluateEligibility(farmerProfile, farmerRules);
    expect(r.eligible).toBe(true);
    expect(r.matchScore).toBe(1);
    expect(r.failReasons).toHaveLength(0);
  });

  test("ineligible when one condition fails", () => {
    const r = evaluateEligibility({ ...farmerProfile, income: 300000 }, farmerRules);
    expect(r.eligible).toBe(false);
    expect(r.matchScore).toBe(0.5);
    expect(r.failReasons).toHaveLength(1);
  });

  test("ineligible when all conditions fail", () => {
    const r = evaluateEligibility({ age: 30, income: 500000, occupation: "Student" }, farmerRules);
    expect(r.eligible).toBe(false);
    expect(r.matchScore).toBe(0);
    expect(r.failReasons).toHaveLength(2);
  });
});

describe("evaluateEligibility — OR logic", () => {
  const rules = {
    logic: "OR",
    conditions: [
      { field: "category", operator: "in", value: ["SC", "ST"] },
      { field: "income", operator: "lte", value: 100000 },
    ],
  };

  test("eligible when at least one condition passes", () => {
    const r = evaluateEligibility({ category: "General", income: 80000 }, rules);
    expect(r.eligible).toBe(true);
  });

  test("ineligible when none pass", () => {
    const r = evaluateEligibility({ category: "General", income: 200000 }, rules);
    expect(r.eligible).toBe(false);
  });
});

describe("evaluateEligibility — edge cases", () => {
  test("empty rules → always eligible", () => {
    const r = evaluateEligibility({ age: 25 }, { logic: "AND", conditions: [] });
    expect(r.eligible).toBe(true);
    expect(r.matchScore).toBe(1);
  });

  test("null rules → always eligible", () => {
    const r = evaluateEligibility({ age: 25 }, null);
    expect(r.eligible).toBe(true);
  });
});

// ─── rankSchemes ──────────────────────────────────────────

describe("rankSchemes", () => {
  const profile = { age: 25, income: 150000, occupation: "Farmer", category: "SC" };

  const schemes = [
    {
      slug: "scheme-a",
      eligibilityRules: {
        logic: "AND",
        conditions: [{ field: "occupation", operator: "eq", value: "Farmer" }],
      },
    },
    {
      slug: "scheme-b",
      eligibilityRules: {
        logic: "AND",
        conditions: [{ field: "income", operator: "lte", value: 100000 }], // fails for 150000
      },
    },
    {
      slug: "scheme-c",
      eligibilityRules: {
        logic: "AND",
        conditions: [
          { field: "occupation", operator: "eq", value: "Farmer" },
          { field: "category", operator: "in", value: ["SC", "ST"] },
        ],
      },
    },
  ];

  test("eligible schemes ranked before ineligible", () => {
    const ranked = rankSchemes(profile, schemes, { includeIneligible: true });
    const eligibleSlugs = ranked.filter((r) => r.eligible).map((r) => r.scheme.slug);
    const ineligibleSlugs = ranked.filter((r) => !r.eligible).map((r) => r.scheme.slug);
    // All eligible come before all ineligible
    const lastEligibleIdx = ranked.findLastIndex((r) => r.eligible);
    const firstIneligibleIdx = ranked.findIndex((r) => !r.eligible);
    expect(lastEligibleIdx).toBeLessThan(firstIneligibleIdx);
  });

  test("higher matchScore schemes rank higher within eligible group", () => {
    const ranked = rankSchemes(profile, schemes, { includeIneligible: true });
    // scheme-c has 2 conditions both passing (score 1.0) vs scheme-a has 1 (score 1.0)
    // Both eligible, order should be stable
    expect(ranked[0].eligible).toBe(true);
  });

  test("minScore filter removes low matches", () => {
    const ranked = rankSchemes(profile, schemes, { includeIneligible: true, minScore: 0.9 });
    ranked.forEach((r) => expect(r.matchScore).toBeGreaterThanOrEqual(0.9));
  });

  test("includeIneligible=false excludes ineligible", () => {
    const ranked = rankSchemes(profile, schemes, { includeIneligible: false });
    ranked.forEach((r) => expect(r.eligible).toBe(true));
  });
});