/**
 * client.js
 * Central API client for all backend calls.
 * Base URL is set via VITE_API_URL env var (defaults to localhost:5000).
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Core fetch wrapper ───────────────────────────────────

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error || data?.errors?.[0]?.msg || "Request failed";
    throw new Error(msg);
  }
  return data;
}

const get  = (path)        => request("GET", path);
const post = (path, body)  => request("POST", path, body);
const del  = (path)        => request("DELETE", path);

// ─── Schemes API ──────────────────────────────────────────

export const schemesApi = {
  /** List all schemes, optionally filtered by category */
  list: (category) =>
    get(`/schemes${category ? `?category=${encodeURIComponent(category)}` : ""}`),

  /** Full-text search */
  search: (q) => get(`/schemes/search?q=${encodeURIComponent(q)}`),

  /** Get all available categories with counts */
  categories: () => get("/schemes/categories"),

  /** Get single scheme by slug */
  get: (slug) => get(`/schemes/${slug}`),

  /** Get AI-simplified description for a scheme + profile */
  simplify: (slug, profile) => post(`/schemes/${slug}/simplify`, { profile }),
};

// ─── Eligibility API ──────────────────────────────────────

export const eligibilityApi = {
  /** Submit profile → get ranked list of matching schemes */
  match: (profile) => post("/eligibility", profile),

  /** Check eligibility for one specific scheme */
  check: (schemeSlug, profile) => post("/eligibility/check", { schemeSlug, ...profile }),
};

// ─── Users API ────────────────────────────────────────────

export const usersApi = {
  /** Save a profile, returns { sessionId, profile } */
  saveProfile: (profile) => post("/users/profile", profile),

  /** Retrieve a saved profile by sessionId */
  getProfile: (sessionId) => get(`/users/profile/${sessionId}`),

  /** Delete a profile */
  deleteProfile: (sessionId) => del(`/users/profile/${sessionId}`),
};

// ─── Health check ─────────────────────────────────────────

export const healthCheck = () =>
  fetch(`${BASE_URL.replace("/api", "")}/health`).then((r) => r.json());

// ─── Analytics API ────────────────────────────────────────

export const analyticsApi = {
  /** Fire-and-forget event tracking */
  track: (schemeSlug, event, category) =>
    post("/analytics/track", { schemeSlug, event, category }).catch(() => {}),

  /** Top viewed schemes */
  top: (limit = 10) => get(`/analytics/top?limit=${limit}`),

  /** Platform-wide event totals */
  platform: () => get("/analytics/platform"),

  /** Stats + 30-day trend for a single scheme */
  schemeStats: (slug) => get(`/analytics/schemes/${slug}`),
};