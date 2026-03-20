import { useState, useEffect } from "react";
import { schemesApi } from "../api/client";
import { BookmarkButton } from "./Bookmarks";
import ShareButton, { ShareStrip } from "./ShareScheme";
import { SchemeDetailSkeleton } from "./Skeletons";
import { trackView, trackSimplifyRequest } from "../services/analytics";

export default function SchemeDetail({ schemeSlug, profile, onBack }) {
  const [scheme, setScheme] = useState(null);
  const [simplified, setSimplified] = useState(null);
  const [loadingSimplify, setLoadingSimplify] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    schemesApi.get(schemeSlug)
      .then((data) => {
        setScheme(data.scheme);
        trackView(data.scheme);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schemeSlug]);

  async function loadSimplified() {
    if (!profile || simplified || loadingSimplify) return;
    setLoadingSimplify(true);
    try {
      const data = await schemesApi.simplify(schemeSlug, profile);
      setSimplified(data.simplified);
    } catch {
      setSimplified("Could not load simplified explanation. Please try again.");
    } finally {
      setLoadingSimplify(false);
    }
  }

  if (loading) return <SchemeDetailSkeleton />;
  if (error) return <ErrorState error={error} onBack={onBack} />;
  if (!scheme) return null;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "apply", label: "How to Apply" },
    { id: "documents", label: "Documents" },
    { id: "ai", label: "✨ Simple" },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.header, background: scheme.bgColor || "#e0f2fe" }}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.schemeTop}>
          <span style={styles.icon}>{scheme.icon || "🏛️"}</span>
          <div>
            <h1 style={styles.name}>{scheme.name}</h1>
            {scheme.nameHindi && <p style={styles.nameHindi}>{scheme.nameHindi}</p>}
            <p style={styles.ministry}>{scheme.ministry}</p>
          </div>
        </div>
        {scheme.tagline && <p style={styles.tagline}>{scheme.tagline}</p>}
        <div style={styles.actionRow}>
          <BookmarkButton scheme={scheme} />
          <ShareButton scheme={scheme} />
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab(t.id); if (t.id === "ai") { loadSimplified(); trackSimplifyRequest(scheme); } }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.body}>

        {/* Overview */}
        {activeTab === "overview" && (
          <div>
            <Section title="What is this scheme?">
              <p style={styles.para}>{scheme.whatIsIt}</p>
            </Section>

            <Section title="💰 Key Benefits">
              <ul style={styles.list}>
                {scheme.benefits?.map((b, i) => <li key={i} style={styles.listItem}>{b}</li>)}
              </ul>
            </Section>

            <Section title="✅ Who Can Apply?">
              <p style={styles.para}>{scheme.eligibilityText}</p>
              {scheme.eligibilityRules?.conditions?.length > 0 && (
                <div style={styles.conditionList}>
                  {scheme.eligibilityRules.conditions.map((c, i) => (
                    <div key={i} style={styles.condition}>
                      <span style={styles.conditionIcon}>📋</span>
                      <span style={styles.conditionLabel}>{c.label || `${c.field} ${c.operator} ${JSON.stringify(c.value)}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <div style={styles.linkRow}>
              {scheme.officialLink && (
                <a href={scheme.officialLink} target="_blank" rel="noreferrer" style={styles.linkBtn}>
                  🌐 Official Website
                </a>
              )}
              {scheme.applyLink && (
                <a href={scheme.applyLink} target="_blank" rel="noreferrer" style={{ ...styles.linkBtn, ...styles.linkBtnPrimary }}>
                  📝 Apply Now
                </a>
              )}
            </div>
            <ShareStrip scheme={scheme} />
          </div>
        )}

        {/* How to Apply */}
        {activeTab === "apply" && (
          <Section title="📋 Step-by-Step Guide">
            {scheme.howToApply?.map((step, i) => (
              <div key={i} style={styles.applyStep}>
                <div style={styles.stepNumber}>{i + 1}</div>
                <p style={styles.stepText}>{step}</p>
              </div>
            ))}
            {scheme.applyLink && (
              <a href={scheme.applyLink} target="_blank" rel="noreferrer"
                style={{ ...styles.linkBtn, ...styles.linkBtnPrimary, display: "block", textAlign: "center", marginTop: 20 }}>
                Start Application →
              </a>
            )}
          </Section>
        )}

        {/* Documents */}
        {activeTab === "documents" && (
          <Section title="📂 Required Documents">
            <p style={{ ...styles.para, marginBottom: 16, fontSize: 13 }}>
              Keep these ready before applying:
            </p>
            {scheme.documents?.map((doc, i) => (
              <div key={i} style={styles.docItem}>
                <span style={styles.docIcon}>📄</span>
                <span style={styles.docText}>{doc}</span>
              </div>
            ))}
          </Section>
        )}

        {/* AI Simplified */}
        {activeTab === "ai" && (
          <Section title="✨ Simple Explanation">
            {loadingSimplify && (
              <div style={styles.aiLoading}>
                <div style={styles.spinner} />
                <p>Claude AI is simplifying this for you...</p>
              </div>
            )}
            {simplified && !loadingSimplify && (
              <div style={styles.aiBox}>
                <p style={styles.aiText}>{simplified}</p>
                <p style={styles.aiNote}>✨ Simplified by Claude AI based on your profile</p>
              </div>
            )}
            {!simplified && !loadingSimplify && !profile && (
              <p style={styles.para}>
                Complete your profile first to get a personalized explanation.
              </p>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p>Loading scheme details...</p>
    </div>
  );
}

function ErrorState({ error, onBack }) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
      <p style={{ color: "#dc2626" }}>{error}</p>
      <button style={styles.backBtn} onClick={onBack}>← Go Back</button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  container: { minHeight: "100vh", background: "#FFFBF5", fontFamily: "'Baloo 2', sans-serif" },
  header: { padding: "20px 20px 24px" },
  backBtn: { background: "none", border: "none", fontSize: 15, color: "#374151", cursor: "pointer", padding: "4px 0", marginBottom: 16, fontFamily: "inherit", fontWeight: 600 },
  schemeTop: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 10 },
  icon: { fontSize: 40, flexShrink: 0 },
  name: { margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#1e3a5f", lineHeight: 1.2 },
  nameHindi: { margin: "0 0 4px", fontSize: 13, color: "#6b7280" },
  ministry: { margin: 0, fontSize: 12, color: "#9ca3af", fontWeight: 600 },
  tagline: { margin: 0, fontSize: 14, fontWeight: 600, color: "#374151", fontStyle: "italic" },
  actionRow: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },
  tabs: { display: "flex", borderBottom: "2px solid #e5e7eb", background: "#fff", overflowX: "auto" },
  tab: { padding: "14px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap", borderBottom: "2px solid transparent", marginBottom: -2 },
  tabActive: { color: "#F97316", borderBottomColor: "#F97316" },
  body: { padding: 20 },
  sectionTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#1e3a5f" },
  para: { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.7 },
  list: { margin: 0, paddingLeft: 20 },
  listItem: { fontSize: 14, color: "#374151", marginBottom: 6, lineHeight: 1.5 },
  conditionList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  condition: { display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8 },
  conditionIcon: { fontSize: 18 },
  conditionLabel: { fontSize: 13, color: "#374151", fontWeight: 500 },
  linkRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 },
  linkBtn: { padding: "12px 18px", border: "2px solid #e5e7eb", borderRadius: 10, background: "#fff", color: "#374151", textDecoration: "none", fontSize: 14, fontWeight: 600, fontFamily: "inherit" },
  linkBtnPrimary: { background: "#F97316", border: "2px solid #F97316", color: "#fff" },
  applyStep: { display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" },
  stepNumber: { width: 30, height: 30, borderRadius: "50%", background: "#F97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
  stepText: { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6, paddingTop: 4 },
  docItem: { display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8 },
  docIcon: { fontSize: 20 },
  docText: { fontSize: 14, color: "#374151", fontWeight: 500 },
  aiLoading: { textAlign: "center", padding: 40, color: "#6b7280" },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#F97316", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" },
  aiBox: { background: "#FFF7ED", border: "2px solid #fed7aa", borderRadius: 12, padding: 20 },
  aiText: { margin: "0 0 12px", fontSize: 14, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" },
  aiNote: { margin: 0, fontSize: 12, color: "#9a3412", fontStyle: "italic" },
};