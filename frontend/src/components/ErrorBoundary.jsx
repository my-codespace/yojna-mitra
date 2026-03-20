import { Component } from "react";

/**
 * ErrorBoundary
 *
 * Catches runtime errors in the React tree and shows a friendly
 * fallback UI instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something broke.</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, send to an error tracking service (Sentry, etc.)
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div style={styles.container}>
        <div style={styles.tricolor} />
        <div style={styles.body}>
          <div style={styles.emoji}>⚠️</div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.subtitle}>कुछ गड़बड़ हो गई</p>

          {process.env.NODE_ENV !== "production" && this.state.error && (
            <pre style={styles.errorDetail}>
              {this.state.error.message}
            </pre>
          )}

          <button style={styles.btn} onClick={this.handleReset}>
            🔄 Try Again
          </button>
          <button
            style={styles.btnSecondary}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#FFFBF5",
    fontFamily: "'Baloo 2', sans-serif",
  },
  tricolor: {
    height: 5,
    background: "linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%)",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 28px",
    textAlign: "center",
    gap: 12,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { margin: 0, fontSize: 22, fontWeight: 800, color: "#1e3a5f" },
  subtitle: { margin: 0, fontSize: 14, color: "#6b7280" },
  errorDetail: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 12,
    color: "#991b1b",
    textAlign: "left",
    maxWidth: 380,
    overflowX: "auto",
    marginTop: 8,
  },
  btn: {
    marginTop: 12,
    padding: "14px 28px",
    background: "#F97316",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSecondary: {
    padding: "12px 24px",
    background: "#fff",
    color: "#374151",
    border: "2px solid #e5e7eb",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};