/**
 * LanguageContext.jsx
 *
 * Provides a global language toggle between English and Hindi.
 * Components can call useLanguage() to get the current language
 * and a toggle function.
 *
 * Usage:
 *   const { lang, isHindi, t } = useLanguage();
 *   <h1>{t("welcome_title")}</h1>
 */

import { createContext, useContext, useState, useCallback } from "react";

// ─── Translations ─────────────────────────────────────────

const STRINGS = {
  en: {
    app_name:             "Yojana Mitra",
    app_tagline:          "Your Scheme Guide",
    welcome_title:        "Yojana Mitra",
    welcome_subtitle:     "Find government schemes you're eligible for — in minutes, not months.",
    get_started:          "Get Started →",
    step_age:             "How old are you?",
    step_income:          "What is your yearly income?",
    step_state:           "Which state do you live in?",
    step_category:        "What is your social category?",
    step_occupation:      "What do you do for work?",
    next:                 "Next →",
    back:                 "← Back",
    find_schemes:         "Find My Schemes 🔍",
    eligible:             "✅ Eligible",
    partial_match:        "⚠️ Partial Match",
    not_eligible:         "❌ Not Eligible",
    browse_all:           "Browse All Schemes",
    saved_schemes:        "Saved Schemes",
    no_saved:             "No saved schemes yet",
    overview:             "Overview",
    how_to_apply:         "How to Apply",
    documents:            "Documents",
    simple:               "✨ Simple",
    apply_now:            "📝 Apply Now",
    official_website:     "🌐 Official Website",
    save:                 "🔖 Save",
    saved:                "🔖 Saved",
    share:                "📤 Share",
    copied:               "✅ Copied!",
    ai_loading:           "Claude AI is simplifying this for you...",
    ai_note:              "✨ Simplified by Claude AI based on your profile",
    key_benefits:         "💰 Key Benefits",
    who_can_apply:        "✅ Who Can Apply?",
    required_docs:        "📂 Required Documents",
    simple_explanation:   "✨ Simple Explanation",
    edit_profile:         "✏️ Profile",
    my_schemes:           "🏆 My Schemes",
    browse:               "🏛️ Browse",
    bookmarks:            "🔖 Saved",
    schemes_found:        (n) => `🎉 You qualify for ${n} scheme${n > 1 ? "s" : ""}!`,
    no_matches:           "No exact matches found",
    free_no_login:        "Free · No login required · Data stays on your device",
    income_below:         "Family income up to",
    search_placeholder:   "Search schemes...",
    search_state:         "Search state...",
    all_schemes:          "All Schemes",
    clear_all:            "🗑️ Clear All Saved Schemes",
  },
  hi: {
    app_name:             "योजना मित्र",
    app_tagline:          "आपका योजना गाइड",
    welcome_title:        "योजना मित्र",
    welcome_subtitle:     "जानें कौन सी सरकारी योजनाओं का आप लाभ उठा सकते हैं — बस कुछ मिनटों में।",
    get_started:          "शुरू करें →",
    step_age:             "आपकी उम्र क्या है?",
    step_income:          "आपकी सालाना आमदनी कितनी है?",
    step_state:           "आप किस राज्य में रहते हैं?",
    step_category:        "आपकी सामाजिक श्रेणी क्या है?",
    step_occupation:      "आप क्या काम करते हैं?",
    next:                 "आगे →",
    back:                 "← वापस",
    find_schemes:         "मेरी योजनाएं खोजें 🔍",
    eligible:             "✅ पात्र हैं",
    partial_match:        "⚠️ आंशिक मिलान",
    not_eligible:         "❌ पात्र नहीं",
    browse_all:           "सभी योजनाएं देखें",
    saved_schemes:        "सहेजी गई योजनाएं",
    no_saved:             "अभी तक कोई योजना नहीं सहेजी",
    overview:             "जानकारी",
    how_to_apply:         "आवेदन कैसे करें",
    documents:            "दस्तावेज़",
    simple:               "✨ सरल",
    apply_now:            "📝 अभी आवेदन करें",
    official_website:     "🌐 आधिकारिक वेबसाइट",
    save:                 "🔖 सहेजें",
    saved:                "🔖 सहेजा गया",
    share:                "📤 शेयर करें",
    copied:               "✅ कॉपी हो गया!",
    ai_loading:           "Claude AI आपके लिए सरल भाषा में समझा रहा है...",
    ai_note:              "✨ Claude AI द्वारा आपकी प्रोफ़ाइल के अनुसार सरलीकृत",
    key_benefits:         "💰 मुख्य लाभ",
    who_can_apply:        "✅ कौन आवेदन कर सकता है?",
    required_docs:        "📂 आवश्यक दस्तावेज़",
    simple_explanation:   "✨ सरल व्याख्या",
    edit_profile:         "✏️ प्रोफ़ाइल",
    my_schemes:           "🏆 मेरी योजनाएं",
    browse:               "🏛️ ब्राउज़",
    bookmarks:            "🔖 सहेजे गए",
    schemes_found:        (n) => `🎉 आप ${n} योजना${n > 1 ? "ओं" : ""} के पात्र हैं!`,
    no_matches:           "कोई सटीक मिलान नहीं मिला",
    free_no_login:        "मुफ़्त · लॉगिन की जरूरत नहीं · डेटा आपके डिवाइस पर",
    income_below:         "पारिवारिक आय अधिकतम",
    search_placeholder:   "योजनाएं खोजें...",
    search_state:         "राज्य खोजें...",
    all_schemes:          "सभी योजनाएं",
    clear_all:            "🗑️ सभी सहेजी गई योजनाएं हटाएं",
  },
};

// ─── Context ──────────────────────────────────────────────

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("ym_lang") || "en"; } catch { return "en"; }
  });

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next = l === "en" ? "hi" : "en";
      try { localStorage.setItem("ym_lang", next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback(
    (key, ...args) => {
      const val = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
      return typeof val === "function" ? val(...args) : val;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, isHindi: lang === "hi", t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

// ─── Toggle button component ──────────────────────────────

export function LanguageToggle({ style = {} }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      style={{ ...toggleStyles.btn, ...style }}
      title={lang === "en" ? "हिंदी में देखें" : "View in English"}
      aria-label="Toggle language"
    >
      {lang === "en" ? "🇮🇳 हिंदी" : "🇬🇧 English"}
    </button>
  );
}

const toggleStyles = {
  btn: {
    padding: "7px 13px",
    border: "2px solid rgba(255,255,255,0.35)",
    borderRadius: 20,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Baloo 2', sans-serif",
    transition: "all 0.15s",
  },
};