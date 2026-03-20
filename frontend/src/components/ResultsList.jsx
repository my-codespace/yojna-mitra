import { useState } from "react";
import SchemeCard from "./SchemeCard";
import { useLanguage } from "../context/LanguageContext";

export default function ResultsList({ results, profile, onSelectScheme, onBrowseAll, onRestart }) {
  const [showPartial, setShowPartial] = useState(false);
  const { t } = useLanguage();

  const { eligible = [], partial = [], eligibleCount, totalChecked } = results;

  return (
    <div style={styles.container}>
      {/* Summary banner */}
      <div style={styles.banner}>
        <div style={styles.tricolor} />
        <div style={styles.bannerContent}>
          <div style={styles.bannerText}>
            <h2 style={styles.bannerTitle}>
              {eligibleCount > 0 ? t("schemes_found", eligibleCount) : t("no_matches")}
            </h2>
            <p style={styles.bannerSub}>
              Checked {totalChecked} schemes for your profile
              {profile && ` · ${profile.occupation} · ${profile.state}`}
            </p>
          </div>
          <button style={styles.restartBtn} onClick={onRestart}>✏️ Edit</button>
        </div>
      </div>

      <div style={styles.body}>
        {/* Eligible schemes */}
        {eligible.length > 0 && (
          <section>
            <h3 style={styles.sectionHead}>✅ You Qualify</h3>
            {eligible.map((r) => (
              <SchemeCard
                key={r.slug}
                scheme={r}
                matchScore={r.matchScore}
                failReasons={r.failReasons}
                status="eligible"
                onClick={() => onSelectScheme(r.slug)}
              />
            ))}
          </section>
        )}

        {/* Partial matches */}
        {partial.length > 0 && (
          <section style={{ marginTop: 8 }}>
            <button style={styles.partialToggle} onClick={() => setShowPartial((v) => !v)}>
              <span>⚠️ {partial.length} partial match{partial.length > 1 ? "es" : ""} — you may qualify with changes</span>
              <span>{showPartial ? "▲" : "▼"}</span>
            </button>
            {showPartial && partial.map((r) => (
              <SchemeCard
                key={r.slug}
                scheme={r}
                matchScore={r.matchScore}
                failReasons={r.failReasons}
                status="partial"
                onClick={() => onSelectScheme(r.slug)}
              />
            ))}
          </section>
        )}

        {/* Empty state */}
        {eligible.length === 0 && (
          <div style={styles.emptyState}>
            <p style={{ fontSize: 40 }}>🔍</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
              No exact matches found
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              Browse all schemes to find what's available in your area.
            </p>
          </div>
        )}

        {/* Browse all CTA */}
        <div style={styles.browseCta}>
          <button style={styles.browseBtn} onClick={onBrowseAll}>
            🏛️ {t("browse_all")}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#FFFBF5", fontFamily: "'Baloo 2', sans-serif" },
  banner: { background: "#1e3a5f", color: "#fff" },
  tricolor: { height: 5, background: "linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%)" },
  bannerContent: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 20px 24px" },
  bannerText: { flex: 1 },
  bannerTitle: { margin: "0 0 6px", fontSize: 20, fontWeight: 800 },
  bannerSub: { margin: 0, fontSize: 12, opacity: 0.7 },
  restartBtn: { padding: "8px 14px", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 10, background: "transparent", color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 },
  body: { padding: "20px 16px 100px" },
  sectionHead: { margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#166534" },
  partialToggle: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fef9c3", border: "2px solid #fef08a", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#854d0e", marginBottom: 12 },
  emptyState: { textAlign: "center", padding: "40px 0 20px" },
  browseCta: { marginTop: 20 },
  browseBtn: { width: "100%", padding: "16px", border: "2px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", fontSize: 16, fontFamily: "inherit", fontWeight: 700, color: "#1e3a5f" },
};