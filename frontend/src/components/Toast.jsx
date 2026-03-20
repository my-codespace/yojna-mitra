import { createContext, useContext, useCallback, useState } from "react";

// ─── Context ──────────────────────────────────────────────

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // max 5 at once
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Convenience helpers
  const toast = {
    info:    (msg, dur) => addToast(msg, "info",    dur),
    success: (msg, dur) => addToast(msg, "success", dur),
    error:   (msg, dur) => addToast(msg, "error",   dur),
    warning: (msg, dur) => addToast(msg, "warning", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ─── Toast container ──────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const { id, message, type } = toast;

  const typeStyles = {
    success: { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", icon: "✅" },
    error:   { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", icon: "❌" },
    warning: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fef08a", icon: "⚠️" },
    info:    { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", icon: "ℹ️" },
  };

  const ts = typeStyles[type] || typeStyles.info;

  return (
    <div
      style={{
        ...styles.toast,
        background: ts.background,
        color: ts.color,
        border: ts.border,
      }}
      role="alert"
    >
      <span style={styles.icon}>{ts.icon}</span>
      <span style={styles.message}>{message}</span>
      <button style={{ ...styles.closeBtn, color: ts.color }} onClick={() => onDismiss(id)}>
        ✕
      </button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  container: {
    position: "fixed",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "calc(100% - 32px)",
    maxWidth: 440,
    pointerEvents: "none",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    pointerEvents: "all",
    fontFamily: "'Baloo 2', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    animation: "slideDown 0.25s ease",
  },
  icon: { fontSize: 18, flexShrink: 0 },
  message: { flex: 1 },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 4px",
    fontFamily: "inherit",
    opacity: 0.7,
  },
};