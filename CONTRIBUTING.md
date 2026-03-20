# Contributing to Yojana Mitra

Thank you for wanting to improve welfare scheme access for millions of Indians. This guide covers how to set up, run, test, and contribute to the project.

---

## Quick Setup

```bash
git clone https://github.com/your-org/yojana-mitra.git
cd yojana-mitra

# Backend
cp .env.example .env          # add ANTHROPIC_API_KEY
npm install
npm run seed                  # seed MongoDB with 10 schemes
npm run dev                   # API on :5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                   # App on :3000
```

Open http://localhost:3000.

---

## Project Structure

```
yojana-mitra/
├── backend/
│   ├── models/           # Mongoose schemas (Scheme, UserProfile)
│   ├── routes/           # Express route handlers
│   ├── services/         # Business logic (eligibility, AI, cache, analytics)
│   ├── middleware/        # Error handler, admin auth
│   └── __tests__/        # Jest unit + integration tests
├── pipeline/             # PDF ingestion (extract → AI structure → MongoDB)
└── frontend/
    └── src/
        ├── api/          # Backend API client
        ├── components/   # React UI components
        ├── context/      # Language context
        ├── hooks/        # Custom React hooks
        └── services/     # Client-side services (eligibility, analytics)
```

---

## Running Tests

```bash
# Unit tests (no DB needed)
npm test -- --testPathPattern="eligibilityEngine|aiSimplifier"

# Integration tests (uses in-memory MongoDB)
npm run test:integration

# All tests with coverage
npm test

# Watch mode during development
npm run test:watch
```

### Writing tests

- Unit tests go in `backend/__tests__/*.test.js`
- Integration tests go in `backend/__tests__/*.integration.test.js`
- Always mock external APIs (`@anthropic-ai/sdk`, `cacheService`)
- Integration tests use `mongodb-memory-server` — no real DB needed

---

## Adding a New Scheme

### Via seed file (permanent addition)

1. Add the scheme object to `SCHEMES` array in `backend/services/seedDatabase.js`
2. Run `npm run seed` — this clears and re-inserts all schemes

Schema reference:
```js
{
  slug: "kebab-case-unique-id",       // required, unique
  name: "Official Scheme Name",
  nameHindi: "हिंदी नाम",
  tagline: "One line benefit summary",
  category: "farmer|student|housing|health|women|labour|business|pension|vendor|general",
  ministry: "Ministry of ...",
  icon: "🌾",                          // single emoji
  bgColor: "#FEF3C7",                 // light card background
  shortDescription: "Under 250 chars",
  whatIsIt: "Full explanation paragraph",
  benefits: ["benefit 1", "benefit 2"],
  documents: ["doc 1", "doc 2"],
  howToApply: ["step 1", "step 2"],
  eligibilityRules: {
    logic: "AND",                      // or "OR"
    conditions: [
      { field: "income", operator: "lte", value: 200000, label: "Income ≤ ₹2L" },
      { field: "age",    operator: "gte", value: 18,     label: "Age 18+" }
    ]
  },
  eligibilityText: "Plain English summary",
  officialLink: "https://...",
  applyLink: "https://..."
}
```

### Via PDF pipeline (one-off addition)

```bash
node pipeline/ingest.js path/to/scheme.pdf
```

---

## Eligibility Engine

The engine is a pure function in `backend/services/eligibilityEngine.js`.

**Supported operators:**

| Operator | Description | Example |
|----------|-------------|---------|
| `eq`     | Equals | `{ field: "occupation", operator: "eq", value: "Farmer" }` |
| `ne`     | Not equals | |
| `lt`     | Less than | |
| `lte`    | Less than or equal | `{ field: "income", operator: "lte", value: 200000 }` |
| `gt`     | Greater than | |
| `gte`    | Greater than or equal | `{ field: "age", operator: "gte", value: 18 }` |
| `in`     | Value in array | `{ field: "category", operator: "in", value: ["SC","ST"] }` |
| `nin`    | Value not in array | |
| `range`  | Between [min, max] inclusive | `{ field: "age", operator: "range", value: [18, 40] }` |

**Profile fields:** `age` (number), `income` (number, annual INR), `state` (string), `category` (General/OBC/SC/ST/EWS), `occupation` (string), `gender` (string)

---

## Frontend Architecture

The app is a single-page React application with **screen-based routing** (no React Router — screens are just state). The screen flow is:

```
WELCOME → WIZARD → RESULTS → DETAIL
                ↘ BROWSE  → DETAIL
                         → BOOKMARKS
```

Screens are managed in `App.jsx` via a `screen` state variable.

### Adding a new screen

1. Add the screen key to the `SCREENS` constant in `App.jsx`
2. Add a render block: `{screen === SCREENS.MY_SCREEN && <MyComponent />}`
3. Optionally add to the bottom nav in `App.jsx`

### Hooks

Prefer the custom hooks in `frontend/src/hooks/hooks.js` over raw `fetch` calls:

```jsx
const { schemes, loading, error } = useSchemes("farmer");
const { results, checkEligibility } = useEligibility();
const { scheme, simplified, fetchSimplified } = useSchemeDetail(slug);
```

### Language / i18n

Use the `useLanguage()` hook for translated strings:

```jsx
const { t, isHindi, toggleLang } = useLanguage();
<h1>{t("welcome_title")}</h1>
```

Add new strings to both `en` and `hi` sections in `LanguageContext.jsx`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `ANTHROPIC_API_KEY` | Yes | For AI simplification and PDF structuring |
| `ADMIN_API_KEY` | Production | Protects `/api/pipeline/ingest` |
| `REDIS_URL` | No | Redis for production caching (falls back to in-memory) |
| `PORT` | No | Server port (default: 5000) |
| `CACHE_TTL` | No | Cache TTL in seconds (default: 86400) |
| `VITE_API_URL` | Frontend | Backend API URL |

---

## Pull Request Guidelines

1. **Tests required** — new routes need integration tests, new engine logic needs unit tests
2. **No personal data** — analytics track scheme slugs only, never user details
3. **Schemes need sources** — link to the official government website in `officialLink`
4. **Hindi required** — new user-facing strings must have a Hindi translation in `LanguageContext.jsx`
5. **Accessibility** — all interactive elements need `aria-label` or visible text, not just emoji

---

## Reporting Issues

- **Wrong eligibility rules** — open an issue with the scheme name, official source, and the correct rule
- **Missing scheme** — open an issue with the scheme name and official PDF/website link
- **AI simplification quality** — open an issue with the scheme slug and what was wrong with the output