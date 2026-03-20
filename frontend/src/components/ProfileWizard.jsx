import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const STEPS = ["Age", "Income", "State", "Category", "Occupation"];

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
  "Andaman & Nicobar Islands","Dadra & Nagar Haveli and Daman & Diu","Lakshadweep",
];

const CATEGORIES = [
  { value: "General", label: "General", icon: "👤" },
  { value: "OBC",     label: "OBC",     icon: "👥" },
  { value: "SC",      label: "SC",      icon: "🤝" },
  { value: "ST",      label: "ST",      icon: "🌿" },
  { value: "EWS",     label: "EWS",     icon: "💛" },
];

const OCCUPATIONS = [
  { value: "Farmer",                       label: "Farmer / Kisaan",       icon: "🌾", hindi: "किसान" },
  { value: "Student",                       label: "Student / Vidyarthi",   icon: "📚", hindi: "विद्यार्थी" },
  { value: "Self-employed / Small Business",label: "Small Business Owner",  icon: "🏪", hindi: "छोटा व्यापारी" },
  { value: "Daily Wage / Labour",           label: "Daily Wage Worker",     icon: "🔨", hindi: "मजदूर" },
  { value: "Street Vendor",                 label: "Street Vendor",         icon: "🛒", hindi: "फेरीवाला" },
  { value: "Salaried (Government)",         label: "Government Employee",   icon: "🏛️", hindi: "सरकारी कर्मचारी" },
  { value: "Salaried (Private)",            label: "Private Employee",      icon: "💼", hindi: "नौकरीपेशा" },
  { value: "Homemaker",                     label: "Homemaker",             icon: "🏠", hindi: "गृहिणी" },
  { value: "Unemployed",                    label: "Unemployed",            icon: "🙋", hindi: "बेरोजगार" },
  { value: "Retired",                       label: "Retired",               icon: "🧓", hindi: "सेवानिवृत्त" },
];

const INCOME_BRACKETS = [
  { label: "Below ₹1 lakh / year",    labelHindi: "₹1 लाख से कम",        value: 80000 },
  { label: "₹1–3 lakh / year",        labelHindi: "₹1–3 लाख",            value: 200000 },
  { label: "₹3–5 lakh / year",        labelHindi: "₹3–5 लाख",            value: 400000 },
  { label: "₹5–8 lakh / year",        labelHindi: "₹5–8 लाख",            value: 650000 },
  { label: "Above ₹8 lakh / year",    labelHindi: "₹8 लाख से अधिक",      value: 1200000 },
];

export default function ProfileWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const { t } = useLanguage();
  const [profile, setProfile] = useState({
    age: "",
    income: "",
    state: "",
    category: "",
    occupation: "",
    gender: "Prefer not to say",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
    setError("");
  }

  function validate() {
    if (step === 0) {
      const age = parseInt(profile.age);
      if (!profile.age || isNaN(age) || age < 1 || age > 100)
        return "Please enter a valid age between 1 and 100";
    }
    if (step === 1 && !profile.income) return "Please select your income range";
    if (step === 2 && !profile.state) return "Please select your state";
    if (step === 3 && !profile.category) return "Please select your category";
    if (step === 4 && !profile.occupation) return "Please select your occupation";
    return null;
  }

  async function handleNext() {
    const err = validate();
    if (err) { setError(err); return; }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — submit
    setSubmitting(true);
    try {
      const finalProfile = { ...profile, age: parseInt(profile.age) };
      await onComplete(finalProfile);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.tricolor} />
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🇮🇳 {t("app_name")}</h1>
          <p style={styles.subtitle}>{t("app_tagline")}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressContainer}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ ...styles.progressStep, ...(i <= step ? styles.progressActive : {}) }}>
            <div style={{ ...styles.progressDot, ...(i <= step ? styles.progressDotActive : {}) }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={styles.progressLabel}>{s}</span>
          </div>
        ))}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div style={styles.card}>
        {step === 0 && (
          <StepAge value={profile.age} onChange={(v) => set("age", v)}
            onGender={(v) => set("gender", v)} gender={profile.gender} />
        )}
        {step === 1 && (
          <StepIncome value={profile.income} onChange={(v) => set("income", v)} />
        )}
        {step === 2 && (
          <StepState value={profile.state} onChange={(v) => set("state", v)} />
        )}
        {step === 3 && (
          <StepCategory value={profile.category} onChange={(v) => set("category", v)} />
        )}
        {step === 4 && (
          <StepOccupation value={profile.occupation} onChange={(v) => set("occupation", v)} />
        )}

        {error && <p style={styles.error}>⚠️ {error}</p>}

        <div style={styles.actions}>
          {step > 0 && (
            <button style={styles.backBtn} onClick={() => { setStep((s) => s - 1); setError(""); }}>
              {t("back")}
            </button>
          )}
          <button
            style={{ ...styles.nextBtn, ...(submitting ? styles.nextBtnDisabled : {}) }}
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? "Finding schemes..." : step === STEPS.length - 1 ? t("find_schemes") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────

function StepAge({ value, onChange, gender, onGender }) {
  const { t } = useLanguage();
  return (
    <div>
      <h2 style={styles.stepTitle}>👤 {t("step_age")}</h2>
      <p style={styles.stepHint}>आपकी उम्र क्या है?</p>
      <input
        type="number"
        min="1" max="100"
        placeholder="Enter your age"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
        autoFocus
      />
      <p style={{ ...styles.stepHint, marginTop: 24 }}>Gender (optional)</p>
      <div style={styles.chipRow}>
        {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
          <button key={g} style={{ ...styles.chip, ...(gender === g ? styles.chipActive : {}) }}
            onClick={() => onGender(g)}>
            {g === "Male" ? "👨 " : g === "Female" ? "👩 " : g === "Other" ? "🧑 " : "🔒 "}{g}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepIncome({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div>
      <h2 style={styles.stepTitle}>💰 {t("step_income")}</h2>
      <p style={styles.stepHint}>परिवार की सालाना आमदनी</p>
      <div style={styles.optionList}>
        {INCOME_BRACKETS.map((b) => (
          <button key={b.value}
            style={{ ...styles.optionBtn, ...(value === b.value ? styles.optionBtnActive : {}) }}
            onClick={() => onChange(b.value)}>
            <span style={styles.optionLabel}>{b.label}</span>
            <span style={styles.optionHindi}>{b.labelHindi}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepState({ value, onChange }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const filtered = STATES.filter((s) => s.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <h2 style={styles.stepTitle}>📍 {t("step_state")}</h2>
      <p style={styles.stepHint}>आप किस राज्य में रहते हैं?</p>
      <input
        placeholder={`${t("search_state")} / राज्य खोजें`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...styles.input, marginBottom: 12 }}
      />
      <div style={styles.stateGrid}>
        {filtered.map((s) => (
          <button key={s}
            style={{ ...styles.stateBtn, ...(value === s ? styles.stateBtnActive : {}) }}
            onClick={() => onChange(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCategory({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div>
      <h2 style={styles.stepTitle}>🪪 {t("step_category")}</h2>
      <p style={styles.stepHint}>आपकी सामाजिक श्रेणी — यह छात्रवृत्ति और आरक्षण के लिए जरूरी है</p>
      <div style={styles.optionList}>
        {CATEGORIES.map((c) => (
          <button key={c.value}
            style={{ ...styles.optionBtn, ...(value === c.value ? styles.optionBtnActive : {}) }}
            onClick={() => onChange(c.value)}>
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <span style={styles.optionLabel}>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepOccupation({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div>
      <h2 style={styles.stepTitle}>🛠️ {t("step_occupation")}</h2>
      <p style={styles.stepHint}>आप क्या काम करते हैं?</p>
      <div style={styles.optionList}>
        {OCCUPATIONS.map((o) => (
          <button key={o.value}
            style={{ ...styles.optionBtn, ...(value === o.value ? styles.optionBtnActive : {}) }}
            onClick={() => onChange(o.value)}>
            <span style={{ fontSize: 22 }}>{o.icon}</span>
            <div>
              <span style={styles.optionLabel}>{o.label}</span>
              <span style={{ ...styles.optionHindi, display: "block" }}>{o.hindi}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = {
  container: { minHeight: "100vh", background: "#FFFBF5", fontFamily: "'Baloo 2', sans-serif" },
  header: { background: "#1e3a5f", color: "#fff" },
  tricolor: { height: 5, background: "linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%)" },
  headerContent: { padding: "20px 24px" },
  title: { margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" },
  subtitle: { margin: "4px 0 0", fontSize: 14, opacity: 0.7 },
  progressContainer: { display: "flex", alignItems: "center", padding: "20px 24px 0", gap: 8, position: "relative", flexWrap: "wrap" },
  progressBar: { position: "absolute", top: "50%", left: 24, right: 24, height: 2, background: "#e5e7eb", zIndex: 0 },
  progressFill: { height: "100%", background: "#F97316", transition: "width 0.3s ease" },
  progressStep: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 1, flex: 1 },
  progressActive: {},
  progressDot: { width: 32, height: 32, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#9ca3af", border: "2px solid #e5e7eb" },
  progressDotActive: { background: "#F97316", color: "#fff", border: "2px solid #F97316" },
  progressLabel: { fontSize: 10, color: "#6b7280", fontWeight: 600 },
  card: { margin: 20, background: "#fff", borderRadius: 16, padding: "28px 20px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" },
  stepTitle: { margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#1e3a5f" },
  stepHint: { margin: "0 0 20px", fontSize: 13, color: "#6b7280" },
  input: { width: "100%", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" },
  optionList: { display: "flex", flexDirection: "column", gap: 10 },
  optionBtn: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left", fontSize: 15, fontFamily: "inherit", transition: "all 0.15s" },
  optionBtnActive: { border: "2px solid #F97316", background: "#FFF7ED" },
  optionLabel: { fontWeight: 600, color: "#1e3a5f" },
  optionHindi: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { padding: "8px 14px", border: "2px solid #e5e7eb", borderRadius: 20, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  chipActive: { border: "2px solid #F97316", background: "#FFF7ED", color: "#F97316", fontWeight: 700 },
  stateGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 280, overflowY: "auto" },
  stateBtn: { padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textAlign: "left" },
  stateBtnActive: { border: "2px solid #F97316", background: "#FFF7ED", fontWeight: 700, color: "#F97316" },
  error: { color: "#dc2626", fontSize: 14, marginTop: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 8 },
  actions: { display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end" },
  backBtn: { padding: "14px 20px", border: "2px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", fontSize: 15, fontFamily: "inherit", color: "#374151", fontWeight: 600 },
  nextBtn: { flex: 1, padding: "14px 20px", border: "none", borderRadius: 12, background: "#F97316", color: "#fff", cursor: "pointer", fontSize: 16, fontFamily: "inherit", fontWeight: 700, transition: "opacity 0.2s" },
  nextBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
};