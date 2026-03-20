import { useState, useEffect } from "react";
import { schemesApi } from "../api/client";
import SchemeCard from "./SchemeCard";
import { SchemeListSkeleton } from "./Skeletons";
import { useLanguage } from "../context/LanguageContext";

const CATEGORY_LABELS = {
  all:      { label: "All",         icon: "🏛️" },
  farmer:   { label: "Farmers",     icon: "🌾" },
  student:  { label: "Students",    icon: "📚" },
  housing:  { label: "Housing",     icon: "🏠" },
  health:   { label: "Health",      icon: "❤️" },
  women:    { label: "Women",       icon: "👩" },
  labour:   { label: "Labour",      icon: "🔨" },
  business: { label: "Business",    icon: "💼" },
  pension:  { label: "Pension",     icon: "🧓" },
  vendor:   { label: "Vendors",     icon: "🛒" },
  general:  { label: "General",     icon: "🌐" },
};

export default function SearchBrowse({ profile, onSelectScheme }) {
  const [schemes, setSchemes]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQ, setSearchQ]     = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useLanguage();

  // Load schemes on category change
  useEffect(() => {
    loadSchemes();
  }, [activeCategory]);

  // Debounced search
  useEffect(() => {
    if (!searchQ.trim()) { loadSchemes(); return; }
    const timer = setTimeout(() => runSearch(searchQ), 350);
    return () => clearTimeout(timer);
  }, [searchQ]);

  async function loadSchemes() {
    setLoading(true);
    try {
      const cat = activeCategory === "all" ? null : activeCategory;
      const data = await schemesApi.list(cat);
      setSchemes(data.schemes || []);
    } catch {
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(q) {
    setIsSearching(true);
    try {
      const data = await schemesApi.search(q);
      setSchemes(data.schemes || []);
    } catch {
      setSchemes([]);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Search bar */}
      <div style={styles.searchBox}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("search_placeholder")}
          style={styles.searchInput}
        />
        {searchQ && (
          <button style={styles.clearBtn} onClick={() => setSearchQ("")}>✕</button>
        )}
      </div>

      {/* Category chips */}
      {!searchQ && (
        <div style={styles.categories}>
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
            <button key={key}
              style={{ ...styles.catChip, ...(activeCategory === key ? styles.catChipActive : {}) }}
              onClick={() => setActiveCategory(key)}>
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div style={styles.results}>
        {(loading || isSearching) ? (
          <SchemeListSkeleton count={3} />
        ) : schemes.length === 0 ? (
          <EmptyState searchQ={searchQ} />
        ) : (
          <>
            <p style={styles.count}>
              {searchQ
                ? `${schemes.length} result${schemes.length !== 1 ? "s" : ""} for "${searchQ}"`
                : `${schemes.length} scheme${schemes.length !== 1 ? "s" : ""}`}
            </p>
            {schemes.map((scheme) => (
              <SchemeCard
                key={scheme.slug}
                scheme={scheme}
                status="eligible"
                matchScore={1}
                onClick={() => onSelectScheme(scheme.slug)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingList() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={styles.skeleton}>
          <div style={{ ...styles.skeletonBlock, width: 48, height: 48, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...styles.skeletonBlock, width: "70%", height: 16, marginBottom: 8 }} />
            <div style={{ ...styles.skeletonBlock, width: "50%", height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ searchQ }) {
  return (
    <div style={styles.empty}>
      <p style={{ fontSize: 36, marginBottom: 8 }}>🔍</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>No schemes found</p>
      {searchQ && <p style={{ fontSize: 13, color: "#6b7280" }}>Try a different search term</p>}
    </div>
  );
}

const styles = {
  container: { background: "#FFFBF5", minHeight: "100%", fontFamily: "'Baloo 2', sans-serif" },
  searchBox: { display: "flex", alignItems: "center", gap: 10, margin: "16px 16px 12px", background: "#fff", border: "2px solid #e5e7eb", borderRadius: 12, padding: "2px 14px" },
  searchIcon: { fontSize: 18, flexShrink: 0 },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 15, padding: "12px 0", fontFamily: "inherit", background: "transparent" },
  clearBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 4 },
  categories: { display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" },
  catChip: { padding: "8px 14px", border: "2px solid #e5e7eb", borderRadius: 20, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap", fontWeight: 600, color: "#374151" },
  catChipActive: { border: "2px solid #F97316", background: "#FFF7ED", color: "#F97316" },
  results: { padding: "0 16px 100px" },
  count: { margin: "0 0 12px", fontSize: 13, color: "#6b7280", fontWeight: 500 },
  skeleton: { display: "flex", gap: 12, padding: 16, background: "#fff", borderRadius: 12, marginBottom: 10, alignItems: "flex-start" },
  skeletonBlock: { background: "#f3f4f6", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" },
  empty: { textAlign: "center", padding: "60px 20px" },
};