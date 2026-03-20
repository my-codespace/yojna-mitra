/**
 * cacheService.js
 *
 * Unified cache interface that uses Redis in production (via REDIS_URL)
 * and falls back to in-memory node-cache in development.
 *
 * All methods return Promises so call sites work identically
 * regardless of which backend is active.
 *
 * Usage:
 *   const cache = require("./cacheService");
 *   await cache.set("key", value, ttlSeconds);
 *   const val = await cache.get("key");  // null if missing/expired
 *   await cache.del("key");
 */

const NodeCache = require("node-cache");
const logger = require("./logger");

// ─── Determine which backend to use ──────────────────────

const useRedis = !!process.env.REDIS_URL;
let redisClient = null;
let memCache = null;

if (useRedis) {
  try {
    // ioredis is an optional peer dependency — only needed in production
    const Redis = require("ioredis");
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    redisClient.on("connect",  () => logger.info("Redis connected"));
    redisClient.on("error",   (e) => logger.warn("Redis error", { message: e.message }));
    redisClient.on("close",   ()  => logger.warn("Redis connection closed"));

    logger.info("Cache: using Redis", { url: process.env.REDIS_URL.replace(/:\/\/.*@/, "://<redacted>@") });
  } catch (err) {
    logger.warn("ioredis not installed — falling back to in-memory cache", { error: err.message });
    redisClient = null;
  }
}

if (!redisClient) {
  const defaultTTL = parseInt(process.env.CACHE_TTL) || 86400;
  memCache = new NodeCache({ stdTTL: defaultTTL, checkperiod: 600 });
  logger.info("Cache: using in-memory (node-cache)");
}

// ─── Unified interface ─────────────────────────────────────

/**
 * Get a cached value. Returns null if key doesn't exist or is expired.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  try {
    if (redisClient) {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    const val = memCache.get(key);
    return val !== undefined ? val : null;
  } catch (err) {
    logger.warn("Cache get error", { key, error: err.message });
    return null;
  }
}

/**
 * Set a value in cache.
 * @param {string} key
 * @param {any} value      — will be JSON-serialized
 * @param {number} [ttl]   — seconds; defaults to CACHE_TTL env var
 */
async function set(key, value, ttl) {
  const effectiveTTL = ttl || parseInt(process.env.CACHE_TTL) || 86400;
  try {
    if (redisClient) {
      await redisClient.set(key, JSON.stringify(value), "EX", effectiveTTL);
    } else {
      memCache.set(key, value, effectiveTTL);
    }
  } catch (err) {
    logger.warn("Cache set error", { key, error: err.message });
  }
}

/**
 * Delete a key from cache.
 * @param {string} key
 */
async function del(key) {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      memCache.del(key);
    }
  } catch (err) {
    logger.warn("Cache del error", { key, error: err.message });
  }
}

/**
 * Delete all keys matching a prefix pattern.
 * Useful for clearing all simplified cache entries for a scheme.
 * @param {string} prefix
 */
async function delByPrefix(prefix) {
  try {
    if (redisClient) {
      // Redis SCAN is non-blocking unlike KEYS
      const stream = redisClient.scanStream({ match: `${prefix}*`, count: 100 });
      const keys = [];
      stream.on("data", (batch) => keys.push(...batch));
      await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
      });
      if (keys.length > 0) await redisClient.del(...keys);
    } else {
      const keys = memCache.keys().filter((k) => k.startsWith(prefix));
      keys.forEach((k) => memCache.del(k));
    }
  } catch (err) {
    logger.warn("Cache delByPrefix error", { prefix, error: err.message });
  }
}

/**
 * Flush the entire cache (use sparingly — mainly for tests).
 */
async function flush() {
  try {
    if (redisClient) {
      await redisClient.flushdb();
    } else {
      memCache.flushAll();
    }
  } catch (err) {
    logger.warn("Cache flush error", { error: err.message });
  }
}

/**
 * Returns whether Redis is being used.
 */
function isRedis() {
  return !!redisClient;
}

/**
 * Gracefully disconnect Redis on shutdown.
 */
async function disconnect() {
  if (redisClient) {
    await redisClient.quit();
  }
}

module.exports = { get, set, del, delByPrefix, flush, isRedis, disconnect };