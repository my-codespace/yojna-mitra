/**
 * Skeletons.jsx
 *
 * Animated placeholder components shown while data loads.
 * Prevents layout shift and gives users a sense of progress.
 */

// ─── Base skeleton block ──────────────────────────────────

function Bone({ width = "100%", height = 16, radius = 6, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

// ─── Scheme card skeleton ─────────────────────────────────

export function SchemeCardSkeleton() {
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <Bone width={48} height={48} radius={10} />
        <div style={{ flex: 1 }}>
          <Bone width="70%" height={16} style={{ marginBottom: 8 }} />
          <Bone width="50%" height={12} />
        </div>
      </div>
      <Bone width="100%" height={12} style={{ marginTop: 14, marginBottom: 6 }} />
      <Bone width="85%" height={12} style={{ marginBottom: 14 }} />
      <Bone width={90} height={24} radius={20} />
    </div>
  );
}

// ─── Scheme list skeleton (n cards) ──────────────────────

export function SchemeListSkeleton({ count = 3 }) {
  return (
    <div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <SchemeCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Scheme detail skeleton ───────────────────────────────

export function SchemeDetailSkeleton() {
  return (
    <div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
      {/* Header */}
      <div style={styles.detailHeader}>
        <Bone width={80} height={14} style={{ marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Bone width={52} height={52} radius={12} />
          <div style={{ flex: 1 }}>
            <Bone width="75%" height={20} style={{ marginBottom: 8 }} />
            <Bone width="55%" height={13} style={{ marginBottom: 6 }} />
            <Bone width="45%" height={11} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        {[80, 100, 90, 70].map((w, i) => (
          <Bone key={i} width={w} height={40} radius={0} />
        ))}
      </div>

      {/* Body */}
      <div style={styles.detailBody}>
        <Bone width="40%" height={18} style={{ marginBottom: 14 }} />
        {[100, 95, 88, 78, 92].map((w, i) => (
          <Bone key={i} width={`${w}%`} height={13} style={{ marginBottom: 8 }} />
        ))}

        <Bone width="35%" height={18} style={{ marginTop: 28, marginBottom: 14 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <Bone width={24} height={24} radius={4} />
            <Bone width="80%" height={13} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Results banner skeleton ──────────────────────────────

export function ResultsBannerSkeleton() {
  return (
    <div style={styles.banner}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
      <Bone width="60%" height={22} style={{ marginBottom: 10 }} />
      <Bone width="40%" height={13} />
    </div>
  );
}

// ─── Full page loading spinner ────────────────────────────

export function PageLoader({ message = "Loading..." }) {
  return (
    <div style={styles.pageLoader}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={styles.spinner} />
      <p style={styles.spinnerText}>{message}</p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  card: {
    background: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    border: "1px solid #e5e7eb",
  },
  cardTop: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 4 },

  detailHeader: { background: "#f3f4f6", padding: "20px 20px 24px" },
  tabRow: { display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", background: "#fff", padding: "0 4px" },
  detailBody: { padding: 20 },

  banner: { background: "#1e3a5f", padding: "24px 20px" },

  pageLoader: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "60vh", gap: 16,
  },
  spinner: {
    width: 40, height: 40,
    border: "3px solid #e5e7eb",
    borderTopColor: "#F97316",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  spinnerText: { fontSize: 15, color: "#6b7280", fontFamily: "'Baloo 2', sans-serif" },
};