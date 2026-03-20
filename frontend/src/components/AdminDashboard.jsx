import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * AdminDashboard
 *
 * Hidden admin screen for uploading government scheme PDFs
 * and monitoring the ingestion pipeline.
 *
 * Access: click the 🔧 icon 5 times on the welcome screen,
 * or navigate to /#admin in the URL.
 */
export default function AdminDashboard({ onClose }) {
  const [status, setStatus]         = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError]   = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [adminKey, setAdminKey]     = useState(() => {
    try { return sessionStorage.getItem("ym_admin_key") || ""; } catch { return ""; }
  });
  const [keyVisible, setKeyVisible] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch(`${API}/pipeline/status`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }

  async function handleFileUpload(file) {
    if (!file || file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported");
      return;
    }
    if (!adminKey.trim()) {
      setUploadError("Admin API key is required. Enter it above.");
      return;
    }

    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    // Persist key for the session
    try { sessionStorage.setItem("ym_admin_key", adminKey); } catch {}

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch(`${API}/pipeline/ingest`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey.trim() },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadResult(data);
      fetchStatus(); // refresh stats
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.tricolor} />
        <div style={styles.headerContent}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.title}>🔧 Admin Dashboard</h1>
              <p style={styles.subtitle}>Pipeline Management — Yojana Mitra</p>
            </div>
            <button style={styles.closeBtn} onClick={onClose}>✕ Close</button>
          </div>
        </div>
      </div>

      <div style={styles.body}>

        {/* Pipeline status cards */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Database Status</h2>
          {status ? (
            <div style={styles.statsGrid}>
              <StatCard label="Total Active Schemes" value={status.totalSchemes} icon="🏛️" />
              {status.byCategory?.map((c) => (
                <StatCard key={c._id} label={c._id} value={c.count} icon="📂" />
              ))}
            </div>
          ) : (
            <p style={styles.loading}>Loading status...</p>
          )}
          <button style={styles.refreshBtn} onClick={fetchStatus}>🔄 Refresh</button>
        </section>

        {/* Admin key */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🔑 Admin API Key</h2>
          <p style={styles.hint}>Required to upload PDFs. Set <code>ADMIN_API_KEY</code> in your <code>.env</code>.</p>
          <div style={styles.keyRow}>
            <input
              type={keyVisible ? "text" : "password"}
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter your ADMIN_API_KEY"
              style={styles.keyInput}
              autoComplete="off"
            />
            <button style={styles.keyToggle} onClick={() => setKeyVisible((v) => !v)}>
              {keyVisible ? "🙈" : "👁️"}
            </button>
          </div>
          {adminKey && (
            <p style={styles.keyStatus}>
              {adminKey.length >= 16 ? "✅ Key entered" : "⚠️ Key looks short — double-check it"}
            </p>
          )}
        </section>

        {/* PDF upload */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📄 Ingest New Scheme PDF</h2>
          <p style={styles.hint}>
            Upload a government scheme PDF. Claude AI will extract the eligibility rules,
            benefits, and application steps automatically.
          </p>

          {/* Drop zone */}
          <div
            style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div style={styles.uploadingState}>
                <div style={styles.spinner} />
                <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                  Extracting text and structuring with AI...
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  This may take 15–30 seconds
                </p>
              </div>
            ) : (
              <>
                <p style={styles.dropText}>📄 Drop a PDF here</p>
                <p style={styles.dropOr}>or</p>
                <label style={styles.fileLabel}>
                  Choose PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                </label>
                <p style={styles.dropHint}>Max 10MB · PDF only</p>
              </>
            )}
          </div>

          {/* Upload result */}
          {uploadResult && (
            <div style={styles.successBox}>
              <p style={styles.successTitle}>✅ Scheme ingested successfully!</p>
              <p style={styles.successDetail}>
                <strong>{uploadResult.scheme?.name}</strong>
                {" "} [{uploadResult.scheme?.category}]
              </p>
              <p style={{ ...styles.successDetail, fontSize: 12, color: "#6b7280" }}>
                Slug: {uploadResult.scheme?.slug}
              </p>
            </div>
          )}

          {uploadError && (
            <div style={styles.errorBox}>
              <p style={{ margin: 0, fontWeight: 700 }}>❌ Ingestion failed</p>
              <p style={{ margin: "4px 0 0", fontSize: 13 }}>{uploadError}</p>
            </div>
          )}
        </section>

        {/* Pipeline steps explanation */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>⚙️ How the Pipeline Works</h2>
          <div style={styles.pipelineSteps}>
            {[
              { icon: "📄", step: "1. Extract", desc: "pdf-parse extracts text layer. Scanned PDFs fall back to Tesseract OCR (English + Hindi)." },
              { icon: "🤖", step: "2. Structure", desc: "Claude AI reads the raw text and outputs a typed JSON document with eligibility rules, benefits, and application steps." },
              { icon: "✅", step: "3. Validate", desc: "Required fields are checked. Eligibility operator types and category values are validated." },
              { icon: "💾", step: "4. Persist", desc: "Scheme is upserted into MongoDB by slug. Immediately live in the app with no restart needed." },
            ].map((s) => (
              <div key={s.step} style={styles.pipelineStep}>
                <span style={styles.pipelineIcon}>{s.icon}</span>
                <div>
                  <p style={styles.pipelineStepTitle}>{s.step}</p>
                  <p style={styles.pipelineStepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CLI instructions */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>💻 CLI Usage</h2>
          <pre style={styles.codeBlock}>{`# Single PDF
npm run pipeline path/to/scheme.pdf

# Multiple PDFs
npm run pipeline scheme1.pdf scheme2.pdf scheme3.pdf`}</pre>
        </section>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statIcon}>{icon}</span>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  container: { minHeight: "100vh", background: "#FFFBF5", fontFamily: "'Baloo 2', sans-serif" },
  header: { background: "#1e3a5f", color: "#fff" },
  tricolor: { height: 5, background: "linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%)" },
  headerContent: { padding: "20px 20px 24px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { margin: "0 0 4px", fontSize: 22, fontWeight: 800 },
  subtitle: { margin: 0, fontSize: 13, opacity: 0.7 },
  closeBtn: { padding: "8px 16px", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 10, background: "transparent", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13 },

  body: { padding: "20px 16px 60px" },
  section: { marginBottom: 32 },
  sectionTitle: { margin: "0 0 14px", fontSize: 17, fontWeight: 700, color: "#1e3a5f", borderBottom: "2px solid #e5e7eb", paddingBottom: 8 },
  hint: { margin: "0 0 16px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 },
  loading: { color: "#6b7280", fontSize: 14 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 },
  statCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 10px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, textAlign: "center" },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: 800, color: "#1e3a5f" },
  statLabel: { fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "capitalize" },
  refreshBtn: { padding: "8px 16px", border: "2px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, color: "#374151" },

  dropZone: { border: "2px dashed #d1d5db", borderRadius: 14, padding: "40px 20px", textAlign: "center", background: "#f9fafb", transition: "all 0.2s" },
  dropZoneActive: { border: "2px dashed #F97316", background: "#FFF7ED" },
  dropText: { fontSize: 18, fontWeight: 700, color: "#374151", margin: "0 0 8px" },
  dropOr: { fontSize: 13, color: "#9ca3af", margin: "0 0 10px" },
  fileLabel: { display: "inline-block", padding: "10px 22px", background: "#F97316", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 },
  dropHint: { margin: "10px 0 0", fontSize: 12, color: "#9ca3af" },

  uploadingState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  spinner: { width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#F97316", borderRadius: "50%", animation: "spin 1s linear infinite" },

  successBox: { marginTop: 14, padding: "14px 16px", background: "#dcfce7", border: "2px solid #bbf7d0", borderRadius: 10 },
  successTitle: { margin: "0 0 6px", fontWeight: 700, color: "#166534", fontSize: 14 },
  successDetail: { margin: 0, fontSize: 13, color: "#166534" },

  errorBox: { marginTop: 14, padding: "14px 16px", background: "#fee2e2", border: "2px solid #fecaca", borderRadius: 10, color: "#991b1b", fontSize: 14 },

  pipelineSteps: { display: "flex", flexDirection: "column", gap: 14 },
  pipelineStep: { display: "flex", gap: 14, padding: "14px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 },
  pipelineIcon: { fontSize: 26, flexShrink: 0 },
  pipelineStepTitle: { margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1e3a5f" },
  pipelineStepDesc: { margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.6 },

  codeBlock: { background: "#1e293b", color: "#e2e8f0", padding: "16px 18px", borderRadius: 12, fontSize: 13, overflowX: "auto", lineHeight: 1.7 },

  keyRow: { display: "flex", gap: 8, alignItems: "center" },
  keyInput: { flex: 1, padding: "12px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none" },
  keyToggle: { padding: "12px", border: "2px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 18 },
  keyStatus: { margin: "8px 0 0", fontSize: 12, color: "#6b7280" },
};