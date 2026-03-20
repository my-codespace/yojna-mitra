# 🇮🇳 Yojana Mitra — योजना मित्र

> Find Indian government schemes you're eligible for — in minutes, not months.

A full-stack welfare scheme discovery app with rule-based eligibility matching, AI-powered simplification, and a PDF ingestion pipeline that can extract new schemes from government PDFs automatically.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              React Frontend             │
│  ProfileWizard → Results → Detail       │
│  SearchBrowse  ← client eligibility     │
└────────────────┬────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────┐
│           Express Backend               │
│  /api/schemes   /api/eligibility        │
│  /api/users     /api/pipeline           │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │       Eligibility Engine         │   │
│  │  eq/ne/lt/lte/gt/gte/in/nin/range│   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │       AI Simplifier              │   │
│  │  Claude → cached explanations    │   │
│  └──────────────────────────────────┘   │
└────────────┬────────────────────────────┘
             │
     ┌───────┴───────┐
     │               │
 MongoDB          Anthropic API
 schemes          claude-sonnet-4
 profiles         simplification
                  PDF structuring
```

---

## Project Structure

```
yojana-mitra/
├── backend/
│   ├── server.js                     # Express — CORS, rate-limit, auth, Mongoose
│   ├── models/
│   │   ├── Scheme.js                 # Scheme schema with eligibility rules + text index
│   │   └── UserProfile.js            # Profile schema with income bucket hook
│   ├── routes/
│   │   ├── schemes.js                # CRUD + search + AI simplify + analytics tracking
│   │   ├── eligibility.js            # Profile → ranked scheme match
│   │   ├── users.js                  # Save / get / delete profiles
│   │   ├── pipeline.js               # PDF ingest (admin-only via adminAuth)
│   │   └── analytics.js              # Event tracking + top/trend queries
│   ├── services/
│   │   ├── eligibilityEngine.js      # Pure rule evaluator — 8 operators, AND/OR
│   │   ├── aiSimplifier.js           # Claude simplification + dual-layer cache
│   │   ├── analyticsService.js       # Fire-and-forget event tracking
│   │   ├── cacheService.js           # Unified Redis/node-cache interface
│   │   ├── seedDatabase.js           # Seeds all 10 schemes
│   │   └── logger.js                 # Winston logger
│   ├── middleware/
│   │   ├── errorHandler.js           # Global error handler
│   │   └── adminAuth.js              # API key auth for pipeline/admin routes
│   └── __tests__/
│       ├── setup.js                  # Test env bootstrapper
│       ├── eligibilityEngine.test.js # 20+ unit tests
│       ├── aiSimplifier.test.js      # Mocked AI + cache tests
│       └── api.integration.test.js   # Full route tests with in-memory MongoDB
│
├── pipeline/
│   ├── pdfExtract.js                 # pdf-parse → Tesseract OCR fallback
│   ├── aiStructure.js                # Claude PDF → typed JSON
│   └── ingest.js                     # 4-step orchestrator — CLI + programmatic
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json             # PWA manifest
│   │   └── sw.js                     # Service worker — offline + cache strategies
│   └── src/
│       ├── api/client.js             # Fetch wrapper for all backend endpoints
│       ├── context/
│       │   └── LanguageContext.jsx   # Hindi/English toggle + 50+ translations
│       ├── hooks/hooks.js            # useSchemes, useEligibility, useSchemeDetail...
│       ├── services/
│       │   ├── eligibilityEngine.js  # Client-side rule mirror (instant feedback)
│       │   └── analytics.js          # Fire-and-forget client-side event tracker
│       └── components/
│           ├── ProfileWizard.jsx     # 5-step onboarding wizard
│           ├── SchemeCard.jsx        # Card with eligibility pill + score bar
│           ├── SchemeDetail.jsx      # 4-tab detail + AI + bookmark + share + analytics
│           ├── ResultsList.jsx       # Ranked eligible + collapsible partial matches
│           ├── SearchBrowse.jsx      # Full-text search + category filter chips
│           ├── Bookmarks.jsx         # Save/unsave + full bookmarks screen
│           ├── ShareScheme.jsx       # Web Share API + WhatsApp/Twitter/clipboard
│           ├── AdminDashboard.jsx    # Drag-and-drop PDF upload + pipeline stats
│           ├── Skeletons.jsx         # Shimmer loading skeletons
│           ├── Toast.jsx             # Toast notification system
│           └── ErrorBoundary.jsx     # React error boundary with Hindi fallback
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Test + build on every push/PR
│       └── deploy.yml                # Push Docker images to GHCR on main
│
├── docker-compose.yml
├── Dockerfile.backend
├── frontend/Dockerfile.frontend
├── frontend/nginx.conf
├── uploads/.gitkeep
├── CONTRIBUTING.md
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Anthropic API key

### 1. Install & Configure

```bash
# Clone and install backend dependencies
cd yojana-mitra
npm install

# Copy env file and add your keys
cp .env.example .env

# Generate a secure admin key (paste into .env as ADMIN_API_KEY)
npm run gen:admin-key

# Edit .env — set ANTHROPIC_API_KEY, ADMIN_API_KEY, and MONGODB_URI

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Seed the Database

```bash
npm run seed
# → Inserts 10 real Indian government schemes into MongoDB
```

### 3. Start Backend

```bash
npm run dev
# → API running at http://localhost:5000
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
# → App running at http://localhost:3000
```

### 5. Verify everything is healthy

```bash
npm run health
# → Checks API, MongoDB, schemes endpoint, pipeline status
```

---

## Docker (Full Stack)

```bash
# Create .env with your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Build and start everything
docker-compose up --build

# Seed the database (first time only)
docker exec yojana-backend node backend/services/seedDatabase.js
```

Visit http://localhost:3000

---

## PDF Ingestion Pipeline

Add new government scheme PDFs to the database automatically:

```bash
# Single PDF
npm run pipeline path/to/pm-scheme.pdf

# Multiple PDFs
npm run pipeline schemes/scheme1.pdf schemes/scheme2.pdf

# Via API (admin)
curl -X POST http://localhost:5000/api/pipeline/ingest \
  -F "pdf=@path/to/scheme.pdf"
```

The pipeline:
1. **Extracts text** using pdf-parse (text-layer PDFs) or Tesseract OCR (scanned)
2. **Structures it** using Claude AI into a typed JSON document
3. **Validates** the extracted data
4. **Upserts** into MongoDB — immediately live in the app

---

## API Reference

### Eligibility
```
POST /api/eligibility
Body: { age, income, state, category, occupation, gender? }
Returns: { eligible: [...], partial: [...], totalChecked, eligibleCount }
```

### Schemes
```
GET  /api/schemes                   # List all schemes
GET  /api/schemes?category=farmer   # Filter by category
GET  /api/schemes/search?q=pension  # Full-text search
GET  /api/schemes/:slug             # Get scheme detail
POST /api/schemes/:slug/simplify    # AI simplification
     Body: { profile: {...} }
```

### Users
```
POST   /api/users/profile           # Save profile → sessionId
GET    /api/users/profile/:id       # Get profile
DELETE /api/users/profile/:id       # Delete profile
```

### Pipeline
```
POST /api/pipeline/ingest           # Upload PDF → ingest  (requires X-Admin-Key header)
GET  /api/pipeline/status           # Stats
```

### Analytics
```
POST /api/analytics/track           # Track an event { schemeSlug, event, category }
GET  /api/analytics/top             # Top viewed schemes
GET  /api/analytics/platform        # Overall event totals
GET  /api/analytics/schemes/:slug   # Stats + 30-day trend for a scheme
```

---

## Eligibility Engine

The engine evaluates profile fields against scheme conditions:

```js
// Condition operators
eq, ne           // equals / not equals
lt, lte, gt, gte // numeric comparisons
in, nin          // array membership
range            // [min, max] inclusive

// Example rule
{
  logic: "AND",
  conditions: [
    { field: "income",     operator: "lte",   value: 200000 },
    { field: "occupation", operator: "eq",    value: "Farmer" },
    { field: "age",        operator: "range", value: [18, 60] }
  ]
}
```

Each condition returns `{ pass, reason }` so failed reasons are shown to users: *"Income ₹3,00,000 exceeds the limit of ₹2,00,000"*

---

## Running Tests

```bash
npm test
# → 20+ unit tests for the eligibility engine
```

---

## Schemes Included

| Scheme | Category | Key Benefit |
|--------|----------|-------------|
| PM-KISAN Samman Nidhi | Farmer | ₹6,000/year |
| National Scholarship Portal | Student | ₹1K–₹1.2L/year |
| PM Awas Yojana | Housing | ₹2.67L subsidy |
| PM Ujjwala Yojana | Women | Free LPG connection |
| Atal Pension Yojana | Pension | ₹1K–₹5K/month |
| PM Mudra Yojana | Business | Loans to ₹10L |
| Post Matric SC/ST Scholarship | Student | Full fees |
| PM SVANidhi | Vendor | Loans to ₹50K |
| Sukanya Samriddhi Yojana | Women | 8.2% savings |
| Startup India Seed Fund | Business | ₹50L funding |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Inline CSS (zero dependencies) |
| Backend | Node.js + Express 4 |
| Database | MongoDB + Mongoose |
| Cache | Redis 7 (production) / node-cache (development) |
| AI | Anthropic Claude (claude-sonnet-4) |
| PDF parsing | pdf-parse + Tesseract.js OCR |
| Logging | Winston |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit, admin API key auth |
| Testing | Jest + supertest + mongodb-memory-server |
| Containers | Docker + nginx |
| CI/CD | GitHub Actions (test + deploy to GHCR) |
| PWA | Service worker + Web App Manifest |
| i18n | Custom LanguageContext (Hindi + English) |