/**
 * ShareScheme.jsx
 *
 * Share a scheme via the native Web Share API (Android/iOS)
 * with a clipboard copy fallback for desktop.
 */

import { useState, useCallback } from "react";
import { trackShare } from "../services/analytics";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function ShareButton({ scheme }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!scheme) return;

    const shareData = {
      title: scheme.name,
      text: `${scheme.name}: ${scheme.shortDescription}\n\nBenefits: ${scheme.benefits?.[0] || ""}\n\nCheck your eligibility on Yojana Mitra!`,
      url: `${BASE_URL}/#scheme/${scheme.slug}`,
    };

    // Try native share first (mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        trackShare(scheme);
        return;
      } catch (e) {
        // User cancelled or error — fall through to clipboard
        if (e.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Final fallback — execCommand
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [scheme]);

  if (!scheme) return null;

  return (
    <button
      onClick={handleShare}
      style={{ ...styles.btn, ...(copied ? styles.btnCopied : {}) }}
      title="Share this scheme"
      aria-label="Share this scheme"
    >
      {copied ? "✅ Copied!" : "📤 Share"}
    </button>
  );
}

// ─── Inline share strip (shows multiple share options) ────

export function ShareStrip({ scheme }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${BASE_URL}/#scheme/${scheme?.slug}`;
  const text = encodeURIComponent(`${scheme?.name}: ${scheme?.shortDescription}`);
  const url = encodeURIComponent(shareUrl);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (!scheme) return null;

  return (
    <div style={styles.strip}>
      <p style={styles.stripLabel}>Share this scheme:</p>
      <div style={styles.stripRow}>
        <a
          href={`https://wa.me/?text=${text}%20${url}`}
          target="_blank" rel="noreferrer"
          style={styles.shareLink}
          title="Share on WhatsApp"
        >
          <span style={styles.shareIcon}>💬</span>
          <span>WhatsApp</span>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${text}&url=${url}`}
          target="_blank" rel="noreferrer"
          style={styles.shareLink}
          title="Share on X/Twitter"
        >
          <span style={styles.shareIcon}>🐦</span>
          <span>X/Twitter</span>
        </a>
        <button onClick={copyLink} style={styles.copyBtn}>
          <span style={styles.shareIcon}>{copied ? "✅" : "🔗"}</span>
          <span>{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  btn: {
    padding: "10px 16px", border: "2px solid #e5e7eb",
    borderRadius: 10, background: "#fff", cursor: "pointer",
    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
    color: "#374151", transition: "all 0.15s",
  },
  btnCopied: {
    border: "2px solid #16a34a", background: "#dcfce7", color: "#166534",
  },

  strip: { marginTop: 20, padding: "16px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" },
  stripLabel: { margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#374151" },
  stripRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  shareLink: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", background: "#fff",
    border: "1px solid #e5e7eb", borderRadius: 8,
    textDecoration: "none", fontSize: 13, fontWeight: 600,
    color: "#374151", fontFamily: "'Baloo 2', sans-serif",
  },
  shareIcon: { fontSize: 16 },
  copyBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", background: "#fff",
    border: "1px solid #e5e7eb", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    color: "#374151", fontFamily: "inherit",
  },
};