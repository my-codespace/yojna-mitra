/**
 * aiSimplifier.test.js
 *
 * Tests AI simplifier with fully mocked Google Gemini SDK and cache.
 * No real API calls are made.
 */

// ─── Mock @google/generative-ai ───────────────────────────

const mockGenerateContent = jest.fn();

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// ─── Mock cacheService ────────────────────────────────────

jest.mock("../../services/cacheService", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  isRedis: jest.fn().mockReturnValue(false),
}));

const cache = require("../../services/cacheService");
const { simplifyScheme, batchSimplify, buildCacheKey } = require("../../services/aiSimplifier");

// ─── Fixtures ─────────────────────────────────────────────

const mockScheme = {
  slug: "pm-kisan",
  name: "PM-KISAN Samman Nidhi",
  nameHindi: "पीएम किसान",
  ministry: "Ministry of Agriculture",
  whatIsIt: "Direct income support for farmers.",
  benefits: ["Rs.6,000/year"],
  howToApply: ["Visit pmkisan.gov.in", "Register online"],
  shortDescription: "Rs.6,000/year for farmers.",
  officialLink: "https://pmkisan.gov.in",
  simplifiedCache: new Map(),
  save: jest.fn().mockResolvedValue(true),
};

const mockProfile = {
  age: 30,
  income: 150000,
  occupation: "Farmer",
  state: "Bihar",
  category: "General",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateContent.mockResolvedValue({
    response: { text: () => "This scheme gives Rs.6,000/year to farmers." },
  });
  mockScheme.simplifiedCache = new Map();
  mockScheme.save.mockClear();
});

// ─── buildCacheKey ────────────────────────────────────────

describe("buildCacheKey", () => {
  test("generates deterministic key from scheme slug and profile", () => {
    const key = buildCacheKey("pm-kisan", mockProfile);
    expect(key).toBe("pm-kisan:farmer-low");
  });

  test("different occupation produces different key", () => {
    const studentProfile = { ...mockProfile, occupation: "Student", income: 200000 };
    const key = buildCacheKey("pm-kisan", studentProfile);
    expect(key).toBe("pm-kisan:student-low");
  });

  test("income bucket boundaries", () => {
    const cases = [
      { income: 80000,  expected: "very-low" },
      { income: 100000, expected: "very-low" },
      { income: 100001, expected: "low" },
      { income: 300000, expected: "low" },
      { income: 300001, expected: "medium" },
      { income: 800000, expected: "medium" },
      { income: 800001, expected: "high" },
    ];
    cases.forEach(({ income, expected }) => {
      const key = buildCacheKey("test", { ...mockProfile, income });
      expect(key).toContain(expected);
    });
  });
});

// ─── simplifyScheme ───────────────────────────────────────

describe("simplifyScheme", () => {
  test("calls Gemini API and returns simplified text", async () => {
    const result = await simplifyScheme(mockScheme, mockProfile);
    expect(result).toBe("This scheme gives Rs.6,000/year to farmers.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  test("prompt includes scheme name and profile details", async () => {
    await simplifyScheme(mockScheme, mockProfile);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("PM-KISAN");
    expect(callArg).toContain("Farmer");
    expect(callArg).toContain("Bihar");
  });

  test("stores result in cache after generation", async () => {
    await simplifyScheme(mockScheme, mockProfile);
    expect(cache.set).toHaveBeenCalledWith(
      "pm-kisan:farmer-low",
      "This scheme gives Rs.6,000/year to farmers."
    );
  });

  test("saves result to scheme.simplifiedCache", async () => {
    await simplifyScheme(mockScheme, mockProfile);
    expect(mockScheme.save).toHaveBeenCalledTimes(1);
    expect(mockScheme.simplifiedCache.get("pm-kisan:farmer-low")).toBe(
      "This scheme gives Rs.6,000/year to farmers."
    );
  });

  test("returns cached value without calling API on cache hit", async () => {
    cache.get.mockResolvedValueOnce("Cached simplified text");
    const result = await simplifyScheme(mockScheme, mockProfile);
    expect(result).toBe("Cached simplified text");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test("returns MongoDB cache value and warms cache without calling API", async () => {
    mockScheme.simplifiedCache.set("pm-kisan:farmer-low", "DB cached text");
    const result = await simplifyScheme(mockScheme, mockProfile);
    expect(result).toBe("DB cached text");
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalledWith("pm-kisan:farmer-low", "DB cached text");
  });

  test("force=true bypasses cache and re-calls API", async () => {
    cache.get.mockResolvedValue("Stale cached value");
    const result = await simplifyScheme(mockScheme, mockProfile, true);
    expect(result).toBe("This scheme gives Rs.6,000/year to farmers.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  test("returns fallback text when API throws", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API error"));
    const result = await simplifyScheme(mockScheme, mockProfile);
    expect(result).toContain(mockScheme.shortDescription);
    expect(result).not.toBeNull();
  });

  test("fallback includes official link", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Network error"));
    const result = await simplifyScheme(mockScheme, mockProfile);
    expect(result).toContain("pmkisan.gov.in");
  });
});

// ─── batchSimplify ────────────────────────────────────────

describe("batchSimplify", () => {
  const schemes = ["scheme-a", "scheme-b", "scheme-c"].map((slug) => ({
    ...mockScheme,
    slug,
    simplifiedCache: new Map(),
    save: jest.fn().mockResolvedValue(true),
  }));

  test("simplifies all schemes and returns results array", async () => {
    const results = await batchSimplify(schemes, mockProfile);
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.schemeSlug).toBeDefined();
      expect(r.text).toBeDefined();
    });
  });

  test("returns fallback text for schemes that fail", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => "OK response" } })
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce({ response: { text: () => "OK response 2" } });

    const results = await batchSimplify(schemes, mockProfile, 3);
    const failed = results.find((r) => r.text === schemes[1].shortDescription);
    expect(failed).toBeDefined();
  });
});