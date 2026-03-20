// backend/__tests__/setup.js
// Runs before all tests — set env vars so modules don't crash on import

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/yojana_mitra_test";
process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
process.env.PORT = "5001";
process.env.CACHE_TTL = "60";