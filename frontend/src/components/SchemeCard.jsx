/**
 * SchemeCard.jsx
 * Compact card shown in results and browse lists.
 * Shows eligibility status as a colored pill + text reason.
 */
import { useLanguage } from "../context/LanguageContext";

export default function SchemeCard({ scheme, matchScore, failReasons = [], status, onClick }) {
  const { t } = useLanguage();
  const isEligible = status === "eligible";
  const isPartial  = status === "partial";

  const pillStyle = isEligible
    ? { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }
    : isPartial
    ? { background: "#fef9c3", color: "#854d0e", border: "1px solid #fef08a" }
    : { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };

  const pillText = isEligible ? t("eligible") : isPartial ? t("partial_match") : t("not_eligible");

  const pct = Math.round((matchScore ?? 1) * 100);

  return (
    <button style={{ ...styles.card, background: scheme.bgColor || "#F3F4F6" }} onClick={onClick}>
      <div style={styles.topRow}>
        <span style={styles.icon}>{scheme.icon || "🏛️"}</span>
        <div style={styles.info}>
          <h3 style={styles.name}>{scheme.name}</h3>
          {scheme.nameHindi && <p style={styles.nameHindi}>{scheme.nameHindi}</p>}
          <p style={styles.ministry}>{scheme.ministry}</p>
        </div>
      </div>

      <p style={styles.description}>{scheme.shortDescription}</p>

      {scheme.benefits?.length > 0 && (
        <p style={styles.benefit}>💰 {scheme.benefits[0]}</p>
      )}

      <div style={styles.footer}>
        <span style={{ ...styles.pill, ...pillStyle }}>{pillText}</span>
        {matchScore !== undefined && (
          <div style={styles.scoreBar}>
            <div style={{ ...styles.scoreFill, width: `${pct}%`, background: isEligible ? "#16a34a" : isPartial ? "#ca8a04" : "#dc2626" }} />
          </div>
        )}
      </div>

      {/* Show first fail reason for partial/ineligible */}
      {!isEligible && failReasons.length > 0 && (
        <p style={styles.failReason}>↳ {failReasons[0]}</p>
      )}
    </button>
  );
}

const styles = {
  card: {
    display: "block", width: "100%", borderRadius: 14, padding: 16,
    border: "none", cursor: "pointer", textAlign: "left",
    marginBottom: 12, transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)", fontFamily: "inherit",
  },
  topRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  icon: { fontSize: 32, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#1e3a5f", lineHeight: 1.3 },
  nameHindi: { margin: "0 0 2px", fontSize: 12, color: "#6b7280" },
  ministry: { margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 500 },
  description: { margin: "10px 0 6px", fontSize: 13, color: "#374151", lineHeight: 1.5 },
  benefit: { margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#1e3a5f" },
  footer: { display: "flex", alignItems: "center", gap: 10 },
  pill: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  scoreBar: { flex: 1, height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },
  failReason: { margin: "8px 0 0", fontSize: 12, color: "#92400e", fontStyle: "italic" },
};