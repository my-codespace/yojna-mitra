import { useState, useRef } from "react";
import ProfileWizard from "./components/ProfileWizard";
import ResultsList from "./components/ResultsList";
import SchemeDetail from "./components/SchemeDetail";
import SearchBrowse from "./components/SearchBrowse";
import AdminDashboard from "./components/AdminDashboard";
import BookmarksScreen from "./components/Bookmarks";
import { useToast } from "./components/Toast";
import { LanguageToggle, useLanguage } from "./context/LanguageContext";
import { eligibilityApi, usersApi } from "./api/client";

// ─── Screens ───────────────────────────────────────────────
// welcome → wizard → results → detail
//                            ← browse → detail

const SCREENS = {
  WELCOME:   "welcome",
  WIZARD:    "wizard",
  RESULTS:   "results",
  DETAIL:    "detail",
  BROWSE:    "browse",
  BOOKMARKS: "bookmarks",
  ADMIN:     "admin",
};

export default function App() {
  const [screen, setScreen]     = useState(SCREENS.WELCOME);
  const [profile, setProfile]   = useState(null);
  const [results, setResults]   = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [detailFrom, setDetailFrom]     = useState(SCREENS.RESULTS);
  const toast = useToast();
  const { t } = useLanguage();

  // ─── Handlers ────────────────────────────────────────────

  async function handleProfileComplete(profileData) {
    // Save profile to backend
    try {
      await usersApi.saveProfile(profileData);
    } catch {
      // Non-fatal — proceed without saving
    }

    // Run eligibility check
    try {
      const data = await eligibilityApi.match(profileData);
      setProfile(profileData);
      setResults(data);
      setScreen(SCREENS.RESULTS);
      if (data.eligibleCount > 0) {
        toast.success(`Found ${data.eligibleCount} scheme${data.eligibleCount > 1 ? "s" : ""} for you!`);
      } else {
        toast.info("No exact matches — showing partial results.");
      }
    } catch (e) {
      toast.error("Could not check eligibility. Please try again.");
      throw e;
    }
  }

  function openDetail(slug, from = SCREENS.RESULTS) {
    setSelectedSlug(slug);
    setDetailFrom(from);
    setScreen(SCREENS.DETAIL);
  }

  function handleBack() {
    setScreen(detailFrom);
  }

  // ─── Bottom nav (visible on results/browse/detail) ───────
  const showNav = [SCREENS.RESULTS, SCREENS.BROWSE, SCREENS.DETAIL, SCREENS.BOOKMARKS].includes(screen);

  return (
    <div style={styles.app}>
      <div style={styles.content}>

        {/* Welcome */}
        {screen === SCREENS.WELCOME && <WelcomeScreen onStart={() => setScreen(SCREENS.WIZARD)} onAdmin={() => setScreen(SCREENS.ADMIN)} />}

        {/* Profile wizard */}
        {screen === SCREENS.WIZARD && (
          <ProfileWizard onComplete={handleProfileComplete} />
        )}

        {/* Eligibility results */}
        {screen === SCREENS.RESULTS && results && (
          <ResultsList
            results={results}
            profile={profile}
            onSelectScheme={(slug) => openDetail(slug, SCREENS.RESULTS)}
            onBrowseAll={() => setScreen(SCREENS.BROWSE)}
            onRestart={() => setScreen(SCREENS.WIZARD)}
          />
        )}

        {/* Scheme detail */}
        {screen === SCREENS.DETAIL && selectedSlug && (
          <SchemeDetail
            schemeSlug={selectedSlug}
            profile={profile}
            onBack={handleBack}
          />
        )}

        {/* Browse all */}
        {screen === SCREENS.BROWSE && (
          <div>
            <div style={styles.browseHeader}>
              <div style={styles.tricolor} />
              <div style={styles.browseHeaderContent}>
                <h1 style={styles.browseTitle}>🏛️ All Schemes</h1>
                <p style={styles.browseSub}>Browse & search all government schemes</p>
              </div>
            </div>
            <SearchBrowse
              profile={profile}
              onSelectScheme={(slug) => openDetail(slug, SCREENS.BROWSE)}
            />
          </div>
        )}

        {/* Admin dashboard */}
        {screen === SCREENS.ADMIN && (
          <AdminDashboard onClose={() => setScreen(SCREENS.WELCOME)} />
        )}

        {/* Bookmarks */}
        {screen === SCREENS.BOOKMARKS && (
          <BookmarksScreen
            onSelectScheme={(slug) => openDetail(slug, SCREENS.BOOKMARKS)}
            onBrowseAll={() => setScreen(SCREENS.BROWSE)}
          />
        )}

      </div>

      {/* Bottom navigation */}
      {showNav && (
        <nav style={styles.bottomNav}>
          <NavBtn
            icon="🏆" label={t("my_schemes")}
            active={screen === SCREENS.RESULTS}
            onClick={() => setScreen(SCREENS.RESULTS)}
            disabled={!results}
          />
          <NavBtn
            icon="🏛️" label={t("browse")}
            active={screen === SCREENS.BROWSE}
            onClick={() => setScreen(SCREENS.BROWSE)}
          />
          <NavBtn
            icon="🔖" label={t("bookmarks")}
            active={screen === SCREENS.BOOKMARKS}
            onClick={() => setScreen(SCREENS.BOOKMARKS)}
          />
          <NavBtn
            icon="✏️" label={t("edit_profile")}
            active={screen === SCREENS.WIZARD}
            onClick={() => setScreen(SCREENS.WIZARD)}
          />
        </nav>
      )}
    </div>
  );
}

// ─── Welcome screen ───────────────────────────────────────

function WelcomeScreen({ onStart, onAdmin }) {
  const { t } = useLanguage();
  const [tapCount, setTapCount] = useState(0);
  const tapRef = useRef(null);

  function handleEmojiTap() {
    const next = tapCount + 1;
    setTapCount(next);
    clearTimeout(tapRef.current);
    if (next >= 5) {
      setTapCount(0);
      onAdmin();
      return;
    }
    // Reset tap counter after 2 seconds of inactivity
    tapRef.current = setTimeout(() => setTapCount(0), 2000);
  }

  return (
    <div style={styles.welcome}>
      <div style={styles.tricolor} />
      <div style={styles.welcomeTopBar}>
        <span />
        <LanguageToggle style={{ color: "#374151", border: "2px solid #e5e7eb" }} />
      </div>
      <div style={styles.welcomeBody}>
        <div style={styles.welcomeEmoji} onClick={handleEmojiTap} title="🔧 Admin (tap 5×)">🇮🇳</div>
        {tapCount > 0 && tapCount < 5 && (
          <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: -8, marginBottom: 8 }}>
            {5 - tapCount} more tap{5 - tapCount !== 1 ? "s" : ""} for admin
          </p>
        )}
        <h1 style={styles.welcomeTitle}>{t("welcome_title")}</h1>
        <p style={styles.welcomeHindi}>{t("app_tagline")}</p>
        <p style={styles.welcomeTagline}>{t("welcome_subtitle")}</p>

        <div style={styles.featureList}>
          {[
            ["🔍", t("step_age") !== "How old are you?" ? "5 आसान सवाल" : "Answer 5 simple questions"],
            ["✅", t("eligible") !== "✅ Eligible" ? "पात्र योजनाएं देखें" : "See schemes you qualify for"],
            ["📋", t("how_to_apply") !== "How to Apply" ? "चरण-दर-चरण गाइड" : "Step-by-step application guides"],
            ["✨", t("simple") !== "✨ Simple" ? "AI में सरल व्याख्या" : "AI-simplified explanations"],
          ].map(([icon, text]) => (
            <div key={text} style={styles.feature}>
              <span style={styles.featureIcon}>{icon}</span>
              <span style={styles.featureText}>{text}</span>
            </div>
          ))}
        </div>

        <button style={styles.startBtn} onClick={onStart}>
          {t("get_started")}
        </button>

        <p style={styles.disclaimer}>{t("free_no_login")}</p>
      </div>
    </div>
  );
}

// ─── Bottom nav button ────────────────────────────────────

function NavBtn({ icon, label, active, onClick, disabled }) {
  return (
    <button
      style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}), ...(disabled ? styles.navBtnDisabled : {}) }}
      onClick={!disabled ? onClick : undefined}
    >
      <span style={styles.navIcon}>{icon}</span>
      <span style={styles.navLabel}>{label}</span>
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  app: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", fontFamily: "'Baloo 2', sans-serif" },
  content: { paddingBottom: 72 },
  tricolor: { height: 5, background: "linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%)" },

  // Welcome
  welcome: { minHeight: "100vh", background: "#FFFBF5" },
  welcomeTopBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px" },
  welcomeBody: { padding: "40px 28px 60px" },
  welcomeEmoji: { fontSize: 60, textAlign: "center", marginBottom: 12 },
  welcomeTitle: { textAlign: "center", margin: "0 0 4px", fontSize: 34, fontWeight: 900, color: "#1e3a5f" },
  welcomeHindi: { textAlign: "center", margin: "0 0 16px", fontSize: 16, color: "#6b7280" },
  welcomeTagline: { textAlign: "center", margin: "0 0 36px", fontSize: 16, color: "#374151", lineHeight: 1.6 },
  featureList: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 },
  feature: { display: "flex", gap: 14, alignItems: "center", background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  featureIcon: { fontSize: 24, flexShrink: 0 },
  featureText: { fontSize: 15, fontWeight: 600, color: "#374151" },
  startBtn: { width: "100%", padding: "18px", border: "none", borderRadius: 14, background: "#F97316", color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(249,115,22,0.4)" },
  disclaimer: { textAlign: "center", marginTop: 16, fontSize: 12, color: "#9ca3af" },

  // Browse header
  browseHeader: { background: "#1e3a5f" },
  browseHeaderContent: { padding: "20px 20px 24px", color: "#fff" },
  browseTitle: { margin: "0 0 4px", fontSize: 22, fontWeight: 800 },
  browseSub: { margin: 0, fontSize: 13, opacity: 0.7 },

  // Bottom nav
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 0 14px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit" },
  navBtnActive: { color: "#F97316" },
  navBtnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, fontWeight: 600, color: "inherit" },
};