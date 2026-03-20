/**
 * analyticsService.test.js
 *
 * Tests analytics tracking and query functions.
 * Uses mongodb-memory-server for a real MongoDB environment.
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear analytics between tests
  const Analytics = mongoose.model("Analytics");
  await Analytics.deleteMany({});
});

// Must require AFTER mongoose is connected
let track, getSchemeStats, getTopSchemes, getSchemeTrend, getPlatformStats;

beforeAll(async () => {
  ({ track, getSchemeStats, getTopSchemes, getSchemeTrend, getPlatformStats } =
    require("../../services/analyticsService"));
});

// ─── track() ─────────────────────────────────────────────

describe("track()", () => {
  test("creates an analytics document for a valid event", async () => {
    await track("pm-kisan", "view", "farmer");

    const Analytics = mongoose.model("Analytics");
    const doc = await Analytics.findOne({ schemeSlug: "pm-kisan", event: "view" });
    expect(doc).not.toBeNull();
    expect(doc.count).toBe(1);
    expect(doc.category).toBe("farmer");
  });

  test("increments count when same event tracked again on same day", async () => {
    await track("pm-kisan", "view", "farmer");
    await track("pm-kisan", "view", "farmer");
    await track("pm-kisan", "view", "farmer");

    const Analytics = mongoose.model("Analytics");
    const doc = await Analytics.findOne({ schemeSlug: "pm-kisan", event: "view" });
    expect(doc.count).toBe(3);
  });

  test("creates separate documents for different events", async () => {
    await track("pm-kisan", "view");
    await track("pm-kisan", "apply_click");
    await track("pm-kisan", "share");

    const Analytics = mongoose.model("Analytics");
    const docs = await Analytics.find({ schemeSlug: "pm-kisan" });
    expect(docs).toHaveLength(3);
  });

  test("creates separate documents for different schemes", async () => {
    await track("pm-kisan", "view");
    await track("pm-awas", "view");
    await track("mudra", "view");

    const Analytics = mongoose.model("Analytics");
    const docs = await Analytics.find({ event: "view" });
    expect(docs).toHaveLength(3);
  });

  test("silently ignores empty schemeSlug", async () => {
    await expect(track("", "view")).resolves.toBeUndefined();
    await expect(track(null, "view")).resolves.toBeUndefined();
  });

  test("silently ignores invalid event", async () => {
    await expect(track("pm-kisan", "invalid_event")).resolves.toBeUndefined();
  });
});

// ─── getSchemeStats() ─────────────────────────────────────

describe("getSchemeStats()", () => {
  beforeEach(async () => {
    await track("pm-kisan", "view");
    await track("pm-kisan", "view");
    await track("pm-kisan", "view");
    await track("pm-kisan", "apply_click");
    await track("pm-kisan", "share");
  });

  test("returns correct totals for each event type", async () => {
    const stats = await getSchemeStats("pm-kisan");
    expect(stats.view).toBe(3);
    expect(stats.apply_click).toBe(1);
    expect(stats.share).toBe(1);
    expect(stats.simplify_request).toBe(0);
  });

  test("returns all zeros for a scheme with no events", async () => {
    const stats = await getSchemeStats("nonexistent-scheme");
    expect(stats.view).toBe(0);
    expect(stats.apply_click).toBe(0);
    expect(stats.simplify_request).toBe(0);
    expect(stats.share).toBe(0);
  });
});

// ─── getTopSchemes() ─────────────────────────────────────

describe("getTopSchemes()", () => {
  beforeEach(async () => {
    // pm-kisan: 5 views
    for (let i = 0; i < 5; i++) await track("pm-kisan", "view", "farmer");
    // pm-awas: 3 views
    for (let i = 0; i < 3; i++) await track("pm-awas", "view", "housing");
    // mudra: 1 view
    await track("mudra", "view", "business");
  });

  test("returns schemes sorted by view count descending", async () => {
    const top = await getTopSchemes(3);
    expect(top).toHaveLength(3);
    expect(top[0]._id).toBe("pm-kisan");
    expect(top[0].totalViews).toBe(5);
    expect(top[1]._id).toBe("pm-awas");
    expect(top[2]._id).toBe("mudra");
  });

  test("respects limit parameter", async () => {
    const top = await getTopSchemes(2);
    expect(top).toHaveLength(2);
  });

  test("returns empty array when no views tracked", async () => {
    await mongoose.model("Analytics").deleteMany({});
    const top = await getTopSchemes(10);
    expect(top).toHaveLength(0);
  });
});

// ─── getPlatformStats() ──────────────────────────────────

describe("getPlatformStats()", () => {
  beforeEach(async () => {
    await track("pm-kisan", "view");
    await track("pm-kisan", "view");
    await track("pm-kisan", "apply_click");
    await track("pm-awas", "view");
    await track("pm-awas", "share");
  });

  test("returns correct totals per event type", async () => {
    const stats = await getPlatformStats();
    const viewStat = stats.find((s) => s._id === "view");
    const applyStat = stats.find((s) => s._id === "apply_click");
    const shareStat = stats.find((s) => s._id === "share");

    expect(viewStat?.total).toBe(3);
    expect(applyStat?.total).toBe(1);
    expect(shareStat?.total).toBe(1);
  });

  test("sorted by total descending", async () => {
    const stats = await getPlatformStats();
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i - 1].total).toBeGreaterThanOrEqual(stats[i].total);
    }
  });
});