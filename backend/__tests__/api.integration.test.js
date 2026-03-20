/**
 * api.integration.test.js
 *
 * Tests the Express routes end-to-end using an in-memory MongoDB instance.
 * No real DB or Anthropic API key needed.
 *
 * Run: npm run test:integration
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let mongoServer;

// ─── Sample scheme for seeding ────────────────────────────

const SAMPLE_SCHEME = {
  slug: "test-scheme-farmers",
  name: "Test Farmer Scheme",
  nameHindi: "टेस्ट किसान योजना",
  tagline: "₹6,000/year for farmers",
  category: "farmer",
  ministry: "Ministry of Agriculture",
  icon: "🌾",
  bgColor: "#FEF3C7",
  shortDescription: "Direct income support for farmers.",
  whatIsIt: "This is a test scheme for farmers.",
  benefits: ["₹6,000 per year"],
  documents: ["Aadhaar", "Land records"],
  howToApply: ["Visit the website", "Fill the form"],
  eligibilityRules: {
    logic: "AND",
    conditions: [
      { field: "income",     operator: "lte",   value: 200000, label: "Income ≤ ₹2L" },
      { field: "occupation", operator: "eq",    value: "Farmer", label: "Must be farmer" },
      { field: "age",        operator: "gte",   value: 18, label: "Age ≥ 18" },
    ],
  },
  eligibilityText: "Farmers with income below ₹2 lakh",
  officialLink: "https://pmkisan.gov.in",
};

const SAMPLE_STUDENT_SCHEME = {
  slug: "test-student-scheme",
  name: "Test Student Scholarship",
  category: "student",
  ministry: "Ministry of Education",
  icon: "📚",
  bgColor: "#EDE9FE",
  shortDescription: "Scholarship for students.",
  whatIsIt: "Scholarship scheme for students.",
  benefits: ["₹10,000/year"],
  documents: ["Aadhaar", "Mark sheet"],
  howToApply: ["Register online"],
  eligibilityRules: {
    logic: "AND",
    conditions: [
      { field: "occupation", operator: "eq",    value: "Student" },
      { field: "income",     operator: "lte",   value: 500000 },
    ],
  },
  eligibilityText: "Students with family income below ₹5 lakh",
};

// ─── Setup / teardown ─────────────────────────────────────

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  // Connect mongoose to in-memory DB
  await mongoose.connect(uri);

  // Seed test schemes
  const Scheme = require("../../models/Scheme");
  await Scheme.insertMany([SAMPLE_SCHEME, SAMPLE_STUDENT_SCHEME]);

  // Import app AFTER mongoose is connected
  app = require("../../server");
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// ─── GET /api/schemes ─────────────────────────────────────

describe("GET /api/schemes", () => {
  test("returns list of active schemes", async () => {
    const res = await request(app).get("/api/schemes");
    expect(res.status).toBe(200);
    expect(res.body.schemes).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test("filters by category", async () => {
    const res = await request(app).get("/api/schemes?category=farmer");
    expect(res.status).toBe(200);
    expect(res.body.schemes).toHaveLength(1);
    expect(res.body.schemes[0].category).toBe("farmer");
  });

  test("respects pagination — limit=1", async () => {
    const res = await request(app).get("/api/schemes?limit=1&page=1");
    expect(res.status).toBe(200);
    expect(res.body.schemes).toHaveLength(1);
    expect(res.body.pagination.pages).toBe(2);
  });

  test("does not return simplifiedCache in list response", async () => {
    const res = await request(app).get("/api/schemes");
    res.body.schemes.forEach((s) => {
      expect(s.simplifiedCache).toBeUndefined();
    });
  });
});

// ─── GET /api/schemes/search ──────────────────────────────

describe("GET /api/schemes/search", () => {
  test("returns matching schemes for query", async () => {
    const res = await request(app).get("/api/schemes/search?q=farmer");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.schemes)).toBe(true);
  });

  test("returns 400 when q is missing", async () => {
    const res = await request(app).get("/api/schemes/search");
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/schemes/categories ─────────────────────────

describe("GET /api/schemes/categories", () => {
  test("returns category counts", async () => {
    const res = await request(app).get("/api/schemes/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    const cats = res.body.categories.map((c) => c._id);
    expect(cats).toContain("farmer");
    expect(cats).toContain("student");
  });
});

// ─── GET /api/schemes/:slug ───────────────────────────────

describe("GET /api/schemes/:slug", () => {
  test("returns full scheme by slug", async () => {
    const res = await request(app).get("/api/schemes/test-scheme-farmers");
    expect(res.status).toBe(200);
    expect(res.body.scheme.name).toBe("Test Farmer Scheme");
    expect(res.body.scheme.benefits).toHaveLength(1);
    expect(res.body.scheme.howToApply).toHaveLength(2);
  });

  test("returns 404 for unknown slug", async () => {
    const res = await request(app).get("/api/schemes/does-not-exist");
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/eligibility ────────────────────────────────

describe("POST /api/eligibility", () => {
  const farmerProfile = {
    age: 30,
    income: 150000,
    state: "Bihar",
    category: "General",
    occupation: "Farmer",
    gender: "Male",
  };

  test("returns eligible schemes for matching farmer profile", async () => {
    const res = await request(app).post("/api/eligibility").send(farmerProfile);
    expect(res.status).toBe(200);
    expect(res.body.eligible.length).toBeGreaterThan(0);
    expect(res.body.eligible[0].slug).toBe("test-scheme-farmers");
  });

  test("returns no eligible schemes for non-matching profile", async () => {
    const res = await request(app).post("/api/eligibility").send({
      age: 30,
      income: 1000000, // too high
      state: "Delhi",
      category: "General",
      occupation: "Salaried (Private)",
    });
    expect(res.status).toBe(200);
    expect(res.body.eligible).toHaveLength(0);
  });

  test("eligible schemes include matchScore and status", async () => {
    const res = await request(app).post("/api/eligibility").send(farmerProfile);
    expect(res.status).toBe(200);
    const scheme = res.body.eligible[0];
    expect(scheme.matchScore).toBeDefined();
    expect(scheme.status).toBe("eligible");
  });

  test("returns 400 for missing required fields", async () => {
    const res = await request(app).post("/api/eligibility").send({ age: 30 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test("returns 400 for invalid category", async () => {
    const res = await request(app).post("/api/eligibility").send({
      ...farmerProfile,
      category: "InvalidCategory",
    });
    expect(res.status).toBe(400);
  });

  test("student profile matches student scheme", async () => {
    const res = await request(app).post("/api/eligibility").send({
      age: 20,
      income: 200000,
      state: "Maharashtra",
      category: "General",
      occupation: "Student",
    });
    expect(res.status).toBe(200);
    const slugs = res.body.eligible.map((s) => s.slug);
    expect(slugs).toContain("test-student-scheme");
    expect(slugs).not.toContain("test-scheme-farmers");
  });
});

// ─── POST /api/eligibility/check ─────────────────────────

describe("POST /api/eligibility/check", () => {
  test("checks single scheme eligibility — eligible", async () => {
    const res = await request(app).post("/api/eligibility/check").send({
      schemeSlug: "test-scheme-farmers",
      age: 25,
      income: 100000,
      state: "UP",
      category: "General",
      occupation: "Farmer",
    });
    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(true);
    expect(res.body.matchScore).toBe(1);
  });

  test("checks single scheme eligibility — ineligible", async () => {
    const res = await request(app).post("/api/eligibility/check").send({
      schemeSlug: "test-scheme-farmers",
      age: 25,
      income: 500000, // over limit
      state: "UP",
      category: "General",
      occupation: "Farmer",
    });
    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(false);
    expect(res.body.failReasons.length).toBeGreaterThan(0);
  });

  test("returns 404 for unknown scheme", async () => {
    const res = await request(app).post("/api/eligibility/check").send({
      schemeSlug: "nonexistent-scheme",
      age: 25,
      income: 100000,
      state: "UP",
      category: "General",
      occupation: "Farmer",
    });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/users/profile ──────────────────────────────

describe("POST /api/users/profile", () => {
  let savedSessionId;

  test("saves a profile and returns sessionId", async () => {
    const res = await request(app).post("/api/users/profile").send({
      age: 28,
      income: 200000,
      state: "Kerala",
      category: "OBC",
      occupation: "Farmer",
      gender: "Male",
    });
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.sessionId).toHaveLength(24);
    expect(res.body.profile.incomeBucket).toBe("low");
    savedSessionId = res.body.sessionId;
  });

  test("retrieves saved profile by sessionId", async () => {
    const res = await request(app).get(`/api/users/profile/${savedSessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.occupation).toBe("Farmer");
    expect(res.body.profile.state).toBe("Kerala");
  });

  test("returns 400 for invalid profile data", async () => {
    const res = await request(app).post("/api/users/profile").send({
      age: -5,
      income: "not-a-number",
    });
    expect(res.status).toBe(400);
  });
});

// ─── Health check ─────────────────────────────────────────

describe("GET /health", () => {
  test("returns healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("connected");
  });
});