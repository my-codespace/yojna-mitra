/**
 * analytics.js
 *
 * Lightweight client-side analytics tracker.
 * Sends events to /api/analytics/track (fire-and-forget — never blocks UI).
 *
 * Usage:
 *   import { trackView, trackApplyClick, trackShare } from "../services/analytics";
 *   trackView(scheme);
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Core track function ───────────────────────────────────

function track(event, schemeSlug, category) {
  if (!schemeSlug) return;

  // Fire-and-forget — don't await, don't block
  fetch(`${API}/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, schemeSlug, category }),
    // keepalive so the request completes even if the page navigates away
    keepalive: true,
  }).catch(() => {
    // Silently ignore network failures — analytics are not critical
  });
}

// ─── Named event helpers ──────────────────────────────────

/** Call when a scheme detail page is opened */
export function trackView(scheme) {
  track("view", scheme?.slug, scheme?.category);
}

/** Call when user taps "Apply Now" */
export function trackApplyClick(scheme) {
  track("apply_click", scheme?.slug, scheme?.category);
}

/** Call when user requests AI simplification */
export function trackSimplifyRequest(scheme) {
  track("simplify_request", scheme?.slug, scheme?.category);
}

/** Call when user shares a scheme */
export function trackShare(scheme) {
  track("share", scheme?.slug, scheme?.category);
}

// ─── Session helpers ──────────────────────────────────────

/**
 * Returns a stable anonymous session ID for this browser.
 * Stored in sessionStorage — cleared when tab closes.
 * Never linked to any personal data.
 */
export function getSessionId() {
  const key = "ym_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}