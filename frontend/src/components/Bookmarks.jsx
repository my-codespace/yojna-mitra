/**
 * Bookmarks.jsx
 *
 * Lets users save schemes they're interested in.
 * Stored in localStorage under "yojana_bookmarks".
 * Shown as a dedicated screen accessible from bottom nav.
 */

import { useState, useCallback } from "react";
import SchemeCard from "./SchemeCard";

const STORAGE_KEY = "yojana_bookmarks";

// ─── Bookmark state helpers (used outside React too) ──────

export function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isBookmarked(slug) {
  return getBookmarks().some((b) => b.slug === slug);
}

export function saveBookmark(scheme) {
  const existing = getBookmarks();
  if (existing.some((b) => b.slug === scheme.slug)) return;
  const updated = [
    { slug: scheme.slug, name: scheme.name, nameHindi: scheme.nameHindi,
      icon: scheme.icon, bgColor: scheme.bgColor, category: scheme.category,
      ministry: scheme.ministry, shortDescription: scheme.shortDescription,
      benefits: scheme.benefits, savedAt: new Date().toISOString() },
    ...existing,
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeBookmark(slug) {
  const updated = getBookmarks().filter((b) => b.slug !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ─── Bookmark button (inline, used in SchemeDetail) ───────

export function BookmarkButton({ scheme }) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(scheme?.slug));

  const toggle = useCallback(() => {
    if (!scheme) return;
    if (bookmarked) {
      removeBookmark(scheme.slug);
      setBookmarked(false);
    } else {
      saveBookmark(scheme);
      setBookmarked(true);
    }
  }, [scheme, bookmarked]);

  if (!scheme) return null;

  return (
    <button
      onClick={toggle}
      style={{
        ...styles.bookmarkBtn,
        ...(bookmarked ? styles.bookmarkBtnActive : {}),
      }}
      title={bookmarked ? "Remove bookmark" : "Save scheme"}
      aria-label={bookmarked ? "Remove bookmark" : "Save scheme"}
    >
      {bookmarked ? "🔖 Saved" : "🔖 Save"}
    </button>
  );
}

// ─── Full bookmarks screen ────────────────────────────────

export default function BookmarksScreen({ onSelectScheme, onBrowseAll }) {
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());

  function handleRemove(slug) {
    removeBookmark(slug);
    setBookmarks((prev) => prev.filter((b) => b.slug !== slug));
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.tricolor} />
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🔖 Saved Schemes</h1>
          <p style={styles.subtitle}>
            {bookmarks.length > 0
              ? `${bookmarks.length} scheme${bookmarks.length > 1 ? "s" : ""} saved`
              : "Your saved schemes appear here"}
          </p>
        </div>
      </div>

      <div style={styles.body}>
        {bookmarks.length === 0 ? (
          <EmptyBookmarks onBrowseAll={onBrowseAll} />
        ) : (
          <>
            {bookmarks.map((scheme) => (
              <div key={scheme.slug} style={styles.cardWrapper}>
                <SchemeCard
                  scheme={scheme}
                  status="eligible"
                  matchScore={1}
                  onClick={() => onSelectScheme(scheme.slug)}
                />
                <button
                  style={styles.removeBtn}
                  onClick={() => handleRemove(scheme.slug)}
                  title="Remove bookmark"
                >
                  ✕ Remove
                </button>
                {scheme.savedAt && (
                  <p style={styles.savedAt}>
                    Saved {new Date(scheme.savedAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </p>
                )}
              </div>
            ))}

            <button
              style={styles.clearAllBtn}
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setBookmarks([]);
              }}
            >
              🗑️ Clear All Saved Schemes
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyBookmarks({ onBrowseAll }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>🔖</div>
      <h2 style={styles.emptyTitle}>No saved schemes yet</h2>
      <p style={styles.emptyHint}>
        Tap the Save button on any scheme to bookmark it for later.
      </p>
      <button style={styles.browseBtn} onClick={onBrowseAll}>
        🏛️ Browse Schemes
      </button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  container: { minHeight: "100vh", background: "#FFFBF5", fontFamily: "'Baloo 2', sans-serif" },
  header: { background: "#1e3a5f", color: "#fff" },
  tricolor: { height: 5, background: "linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%)" },
  headerContent: { padding: "20px 20px 24px" },
  title: { margin: "0 0 4px", fontSize: 22, fontWeight: 800 },
  subtitle: { margin: 0, fontSize: 13, opacity: 0.7 },

  body: { padding: "20px 16px 100px" },

  cardWrapper: { position: "relative", marginBottom: 4 },
  removeBtn: {
    position: "absolute", top: 12, right: 12,
    background: "rgba(255,255,255,0.85)", border: "1px solid #e5e7eb",
    borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700,
    color: "#6b7280", cursor: "pointer", fontFamily: "inherit",
  },
  savedAt: { margin: "0 0 14px", fontSize: 11, color: "#9ca3af", paddingLeft: 4 },

  clearAllBtn: {
    width: "100%", marginTop: 12, padding: "13px",
    border: "2px solid #fee2e2", borderRadius: 12,
    background: "#fff", color: "#dc2626",
    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },

  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px", textAlign: "center" },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#1e3a5f" },
  emptyHint: { margin: "0 0 28px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 },
  browseBtn: { padding: "14px 28px", border: "none", borderRadius: 12, background: "#F97316", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  bookmarkBtn: {
    padding: "10px 16px", border: "2px solid #e5e7eb", borderRadius: 10,
    background: "#fff", cursor: "pointer", fontSize: 14,
    fontWeight: 700, fontFamily: "inherit", color: "#374151", transition: "all 0.15s",
  },
  bookmarkBtnActive: {
    border: "2px solid #F97316", background: "#FFF7ED", color: "#ea580c",
  },
};