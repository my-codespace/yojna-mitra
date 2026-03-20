/**
 * cacheService.test.js
 *
 * Tests the cacheService with the in-memory (node-cache) backend.
 * Redis path is tested via a manual mock.
 */

// Use in-memory cache (no REDIS_URL set in test env)
delete process.env.REDIS_URL;

// Need to re-require after unsetting env
jest.resetModules();
const cache = require("../../services/cacheService");

afterEach(async () => {
  await cache.flush();
});

afterAll(async () => {
  await cache.disconnect();
});

// ─── Basic get/set/del ───────────────────────────────────

describe("cacheService — in-memory backend", () => {
  test("set and get a string value", async () => {
    await cache.set("test:string", "hello world");
    const val = await cache.get("test:string");
    expect(val).toBe("hello world");
  });

  test("set and get an object value", async () => {
    const obj = { scheme: "pm-kisan", profile: "farmer-low", text: "Simplified text" };
    await cache.set("test:object", obj);
    const val = await cache.get("test:object");
    expect(val).toEqual(obj);
  });

  test("returns null for missing key", async () => {
    const val = await cache.get("test:nonexistent-key-xyz");
    expect(val).toBeNull();
  });

  test("del removes a key", async () => {
    await cache.set("test:del", "to be deleted");
    await cache.del("test:del");
    const val = await cache.get("test:del");
    expect(val).toBeNull();
  });

  test("set with TTL expires correctly", async () => {
    await cache.set("test:ttl", "expires soon", 1); // 1 second TTL
    const before = await cache.get("test:ttl");
    expect(before).toBe("expires soon");

    await new Promise((r) => setTimeout(r, 1100)); // wait 1.1 seconds
    const after = await cache.get("test:ttl");
    expect(after).toBeNull();
  }, 5000);

  test("flush clears all keys", async () => {
    await cache.set("test:a", "value-a");
    await cache.set("test:b", "value-b");
    await cache.flush();
    expect(await cache.get("test:a")).toBeNull();
    expect(await cache.get("test:b")).toBeNull();
  });

  test("isRedis returns false when no REDIS_URL", () => {
    expect(cache.isRedis()).toBe(false);
  });
});

// ─── delByPrefix ─────────────────────────────────────────

describe("cacheService.delByPrefix", () => {
  test("deletes all keys matching prefix", async () => {
    await cache.set("pm-kisan:farmer-low", "text-1");
    await cache.set("pm-kisan:student-medium", "text-2");
    await cache.set("pm-awas:farmer-low", "should-survive");

    await cache.delByPrefix("pm-kisan:");

    expect(await cache.get("pm-kisan:farmer-low")).toBeNull();
    expect(await cache.get("pm-kisan:student-medium")).toBeNull();
    expect(await cache.get("pm-awas:farmer-low")).toBe("should-survive");
  });

  test("does nothing when no keys match prefix", async () => {
    await cache.set("other:key", "value");
    await expect(cache.delByPrefix("no-match-prefix:")).resolves.toBeUndefined();
    expect(await cache.get("other:key")).toBe("value");
  });
});

// ─── Error resilience ─────────────────────────────────────

describe("cacheService — error resilience", () => {
  test("get returns null on internal error without throwing", async () => {
    // Temporarily break the cache to simulate an error
    const NodeCache = require("node-cache");
    const orig = NodeCache.prototype.get;
    NodeCache.prototype.get = () => { throw new Error("Simulated error"); };

    // Should not throw — should return null
    const result = await cache.get("any-key");
    expect(result).toBeNull();

    NodeCache.prototype.get = orig; // restore
  });

  test("set silently fails on internal error without throwing", async () => {
    const NodeCache = require("node-cache");
    const orig = NodeCache.prototype.set;
    NodeCache.prototype.set = () => { throw new Error("Simulated error"); };

    await expect(cache.set("any-key", "value")).resolves.toBeUndefined();

    NodeCache.prototype.set = orig;
  });
});