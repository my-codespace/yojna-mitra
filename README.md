# 🇮🇳 Yojana Mitra — योजना मित्र

> Find Indian government schemes you're eligible for — in minutes, not months.

A full-stack welfare scheme discovery app with rule-based eligibility matching, AI-powered simplification via **Google Gemini 2.5 Flash** (free), and a PDF ingestion pipeline that extracts new schemes from government PDFs automatically.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              React Frontend             │
│  ProfileWizard → Results → Detail       │
│  SearchBrowse ← Bookmarks ← Browse      │
└────────────────┬────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────┐
│           Express Backend               │
│  /api/schemes    /api/eligibility       │
│  /api/users      /api/pipeline          │
│  /api/analytics                         │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │       Eligibility Engine         │   │
│  │  eq/ne/lt/lte/gt/gte/in/nin/range│   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │       AI Simplifier              │   │
│  │  Gemini 2.5 Flash (free REST API)│   │
│  └──────────────────────────────────┘   │
└────────────┬────────────────────────────┘
             │
     ┌───────┴───────┐
     │               │
  MongoDB         Google Gemini
  schemes         2.5 Flash (free)
  profiles        simplification
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
│   │   ├── pipeline.js               # PDF ingest (POST admin-only, GET status public)
│   │   └── analytics.js              # Event tracking + top/trend queries
│   ├── services/
│   │   ├── eligibilityEngine.js      # Pure rule evaluator — 8 operators, AND/OR
│   │   ├── aiSimplifier.js           # Gemini 2.5 Flash simplification + dual-layer cache
│   │   ├── analyticsService.js       # Fire-and-forget event tracking
│   │   ├── cacheService.js           # Unified Redis/node-cache interface
│   │   ├── seedDatabase.js           # Seeds all 24 schemes into MongoDB
│   │   └── logger.js                 # Winston logger
│   ├── middleware/
│   │   ├── errorHandler.js           # Global error handler
│   │   └── adminAuth.js              # API key auth for pipeline POST route
│   └── __tests__/
│       ├── setup.js                  # Test env bootstrapper
│       ├── eligibilityEngine.test.js # 20+ unit tests
│       ├── aiSimplifier.test.js      # Mocked AI + cache tests
│       ├── api.integration.test.js   # Full route tests with in-memory MongoDB
│       ├── analyticsService.test.js  # Analytics tracking tests
│       └── cacheService.test.js      # Cache get/set/TTL/prefix tests
│
├── pipeline/
│   ├── pdfExtract.js                 # pdf-parse → Tesseract OCR fallback
│   ├── aiStructure.js                # Gemini 2.5 Flash: PDF text → typed JSON
│   └── ingest.js                     # 4-step orchestrator — CLI + programmatic
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json             # PWA manifest (Add to Home Screen)
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
│           ├── SchemeDetail.jsx      # 4-tab detail + AI + bookmark + share
│           ├── ResultsList.jsx       # Ranked eligible + collapsible partial matches
│           ├── SearchBrowse.jsx      # Full-text search + category filter chips
│           ├── Bookmarks.jsx         # Save/unsave + full bookmarks screen
│           ├── ShareScheme.jsx       # Web Share API + WhatsApp/Twitter/clipboard
│           ├── AdminDashboard.jsx    # PDF upload + admin key input + pipeline stats
│           ├── Skeletons.jsx         # Shimmer loading skeletons
│           ├── Toast.jsx             # Toast notification system
│           └── ErrorBoundary.jsx     # React error boundary with Hindi fallback
│
├── scripts/
│   ├── generate-admin-key.js         # npm run gen:admin-key
│   ├── check-health.js               # npm run health
│   ├── reset-cache.js                # npm run reset:cache
│   └── migrate-indexes.js            # npm run migrate:indexes
│
├── .github/workflows/
│   ├── ci.yml                        # Test + build on every push/PR
│   └── deploy.yml                    # Push Docker images to GHCR on main
│
├── docker-compose.yml                # MongoDB + Redis + Backend + Frontend
├── Dockerfile.backend
├── frontend/Dockerfile.frontend
├── frontend/nginx.conf
├── CONTRIBUTING.md
├── CHANGELOG.md
├── PRODUCTION_CHECKLIST.md
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| MongoDB | 6+ | Local install or Docker |
| Google AI key | Free | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

### 1. Get a free Google AI key

Go to **https://aistudio.google.com/app/apikey** → sign in with Google → **Create API key** → copy it.
No credit card required. Free tier: 5 requests/minute, 20 requests/day.

### 2. Install & Configure

```bash
cd yojana-mitra

# Install backend dependencies
npm install

# Copy env template
cp .env.example .env

# Generate a secure admin key and paste it into .env as ADMIN_API_KEY
npm run gen:admin-key
```

Open `.env` and set:
```
GOOGLE_API_KEY=your-google-ai-studio-key-here
ADMIN_API_KEY=paste-generated-key-here
MONGODB_URI=mongodb://localhost:27017/yojana_mitra
```

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Start MongoDB

**Option A — Docker (recommended):**
```bash
docker run -d --name yojana-mongo -p 27017:27017 mongo:7.0
# Next time just run:
docker start yojana-mongo
```

**Option B — Local MongoDB service:**
```bash
# Windows (run as Administrator)
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 4. Seed the Database

```bash
npm run seed
# → Inserts 24 real Indian government schemes into MongoDB
```

### 5. Start the Backend

```bash
npm run dev
# → API running at http://localhost:5000
# → You should see: "MongoDB connected" and "Yojana Mitra API running on port 5000"
```

### 6. Start the Frontend

```bash
cd frontend
npm run dev
# → App running at http://localhost:3000
```

### 7. Verify everything works

```bash
npm run health
# ✅ API server
# ✅ Database (MongoDB)
# ✅ Schemes endpoint (24 schemes loaded)
# ✅ Pipeline status
```

Open **http://localhost:3000** in your browser.

---

## Docker (Full Stack)

```bash
# Set your keys in .env first
cp .env.example .env
# Edit .env with GOOGLE_API_KEY and ADMIN_API_KEY

# Start everything (MongoDB + Redis + Backend + Frontend)
docker-compose up --build

# Seed the database (first time only)
docker exec yojana-backend node backend/services/seedDatabase.js
```

Visit **http://localhost:3000**

---

## All npm Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start backend in watch mode (port 5000) |
| `npm run seed` | Seed 24 schemes into MongoDB |
| `npm test` | Run all tests with coverage |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:integration` | Integration tests only |
| `npm run health` | Check all services are healthy |
| `npm run gen:admin-key` | Generate a secure admin API key |
| `npm run reset:cache` | Clear all AI simplification cache |
| `npm run migrate:indexes` | Create/update all MongoDB indexes |
| `npm run pipeline <path.pdf>` | Ingest a scheme from a PDF file |
| `cd frontend && npm run dev` | Start frontend dev server (port 3000) |
| `cd frontend && npm run build` | Build frontend for production |

---

## PDF Ingestion Pipeline

Add new government scheme PDFs to the database automatically.

**Important notes for the free Gemini tier:**
- Only **20 PDF uploads per day** on free tier
- PDF should be text-based (not a scanned image)
- Ideal PDF size: under 5 pages for best results

**Via Admin Dashboard (easiest):**
1. Open `http://localhost:3000`
2. Tap the 🇮🇳 flag **5 times quickly** on the welcome screen
3. Enter your `ADMIN_API_KEY`
4. Drag and drop a PDF

**Via command line:**
```bash
npm run pipeline path/to/scheme.pdf
```

**Via API:**
```bash
curl -X POST http://localhost:5000/api/pipeline/ingest \
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY" \
  -F "pdf=@path/to/scheme.pdf"
```

The pipeline:
1. **Extracts text** using pdf-parse (text PDFs) or Tesseract OCR (scanned)
2. **Truncates smartly** — takes first 2,000 + middle 1,000 chars to fit token limits
3. **Structures it** using Gemini 2.5 Flash into typed JSON with eligibility rules
4. **Repairs JSON** automatically if the response is truncated
5. **Upserts** into MongoDB — immediately live in the app

---

## Adding Schemes Manually

Open `backend/services/seedDatabase.js` and add a scheme object to the `SCHEMES` array:

```js
{
  slug: "unique-scheme-slug",           // lowercase, hyphens only
  name: "Full Scheme Name",
  nameHindi: "हिंदी नाम",
  tagline: "One line benefit summary",
  category: "farmer",                   // farmer|student|housing|health|women|labour|business|pension|vendor|general
  ministry: "Ministry of ...",
  icon: "🌾",
  bgColor: "#FEF3C7",
  shortDescription: "2-3 sentence description.",
  whatIsIt: "Longer explanation paragraph.",
  benefits: ["Benefit 1", "Benefit 2"],
  documents: ["Aadhaar card", "Bank passbook"],
  howToApply: ["Step 1", "Step 2", "Step 3"],
  eligibilityRules: {
    logic: "AND",
    conditions: [
      { field: "income",     operator: "lte",   value: 200000, label: "Income up to Rs.2 lakh" },
      { field: "occupation", operator: "eq",    value: "Farmer", label: "Must be a farmer" },
      { field: "age",        operator: "gte",   value: 18, label: "Age 18 or above" },
    ],
  },
  eligibilityText: "Plain English summary of who can apply",
  officialLink: "https://scheme-website.gov.in",
  applyLink: "https://apply-link.gov.in",
},
```

Then run: `npm run seed`

**Eligibility operators:**
`eq` `ne` `lt` `lte` `gt` `gte` `in` `nin` `range`

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
GET  /api/schemes                    # List all schemes
GET  /api/schemes?category=farmer    # Filter by category
GET  /api/schemes/search?q=pension   # Full-text search
GET  /api/schemes/:slug              # Get scheme detail
POST /api/schemes/:slug/simplify     # AI simplification
     Body: { profile: {...} }
```

### Users
```
POST   /api/users/profile            # Save profile → sessionId
GET    /api/users/profile/:id        # Get profile
DELETE /api/users/profile/:id        # Delete profile
```

### Pipeline
```
POST /api/pipeline/ingest            # Upload PDF (requires X-Admin-Key header)
GET  /api/pipeline/status            # Scheme counts by category (public)
```

### Analytics
```
POST /api/analytics/track            # Track event { schemeSlug, event, category }
GET  /api/analytics/top              # Top viewed schemes
GET  /api/analytics/platform         # Overall event totals
GET  /api/analytics/schemes/:slug    # Stats + 30-day trend for a scheme
```

---

## Eligibility Engine

Pure function rule evaluator — no I/O, fully testable:

```js
{
  logic: "AND",   // AND = all must pass, OR = any one must pass
  conditions: [
    { field: "income",     operator: "lte",   value: 200000 },
    { field: "occupation", operator: "eq",    value: "Farmer" },
    { field: "age",        operator: "range", value: [18, 60] },
    { field: "category",   operator: "in",    value: ["SC", "ST"] },
  ]
}
```

Each failed condition returns a human-readable reason shown to the user:
*"Income ₹3,00,000 exceeds the limit of ₹2,00,000"*

**Available fields:** `age` `income` `state` `category` `occupation` `gender`

---

## Running Tests

```bash
# All tests with coverage report
npm test

# Unit tests only (no MongoDB needed)
npm test -- --testPathPattern="eligibilityEngine|aiSimplifier|cacheService"

# Integration tests (uses in-memory MongoDB)
npm run test:integration

# Watch mode during development
npm run test:watch
```

---

## Schemes Included (24 total)

| Scheme | Category | Key Benefit |
|--------|----------|-------------|
| PM-KISAN Samman Nidhi | Farmer | ₹6,000/year direct to farmers |
| National Scholarship Portal | Student | ₹1K–₹1.2L/year |
| PM Awas Yojana Urban | Housing | ₹2.67L home loan subsidy |
| PM Ujjwala Yojana | Women | Free LPG connection |
| Atal Pension Yojana | Pension | ₹1K–₹5K/month after 60 |
| PM Mudra Yojana | Business | Loans to ₹10L, no collateral |
| Post Matric Scholarship SC/ST | Student | Full tuition + allowance |
| PM SVANidhi | Vendor | Micro loans to ₹50K |
| Sukanya Samriddhi Yojana | Women | 8.2% savings for daughters |
| Startup India Seed Fund | Business | ₹50L funding + tax holiday |
| Maharashtra DBT Scholarship | Student | Tuition waiver (Maharashtra) |
| UP Kisan Karj Rahat Yojana | Farmer | Loan waiver ₹1L (UP) |
| Rajasthan Free Mobile Yojana | Women | Free smartphone + 3yr data (Rajasthan) |
| Karnataka Arogya Karnataka | Health | ₹5L cashless health cover (Karnataka) |
| Ayushman Bharat PM-JAY | Health | ₹5L hospitalisation/year |
| PM Suraksha Bima Yojana | General | ₹2L accident cover for ₹20/year |
| PM Jeevan Jyoti Bima | General | ₹2L life cover for ₹436/year |
| PM Matru Vandana Yojana | Women | ₹5,000 for pregnant women |
| PM Fasal Bima Yojana | Farmer | Crop insurance at 2% premium |
| Kisan Credit Card | Farmer | Crop loan at 4% interest |
| e-Shram Portal | Labour | Free ₹2L accident insurance |
| Stand-Up India | Business | ₹10L–₹1Cr loan for SC/ST & women |
| PM Employment Generation (PMEGP) | Business | 25–35% subsidy on new business |
| PM Jan Dhan Yojana | General | Free zero-balance bank account |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Inline CSS (zero dependencies) |
| Backend | Node.js + Express 4 |
| Database | MongoDB + Mongoose |
| Cache | Redis 7 (production) / node-cache (dev) |
| AI | Google Gemini 2.5 Flash (free REST API, no SDK) |
| PDF parsing | pdf-parse + Tesseract.js OCR |
| Logging | Winston |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit, admin API key |
| Testing | Jest + supertest + mongodb-memory-server |
| Containers | Docker + nginx |
| CI/CD | GitHub Actions (test + deploy to GHCR) |
| PWA | Service worker + Web App Manifest |
| i18n | Custom LanguageContext (Hindi + English) |

---

## Known Limitations

| Limitation | Detail |
|-----------|--------|
| Gemini free tier | 20 PDF uploads per day, 5 per minute |
| AI simplification | First request per profile/scheme is live; subsequent are cached |
| PDF pipeline | Works best on text-based PDFs; scanned PDFs use OCR (slower) |
| Offline mode | Cached schemes work offline; new eligibility checks require network |

---

## Troubleshooting

**MongoDB connection refused:**
```bash
# Start MongoDB (Docker)
docker start yojana-mongo

# Or start as Windows service
net start MongoDB
```

**`Cannot find module '@google/...'`:**
```bash
# Run npm install from the ROOT folder, not from backend/
cd yojana-mitra
npm install
```

**Pipeline: "Model returned invalid JSON":**
- Gemini hit the output token limit — the fix (maxOutputTokens: 8192 + JSON repair) is in the latest `pipeline/aiStructure.js`
- Replace your local file with the latest version and restart

**Pipeline: 429 Too Many Requests:**
- You've hit the 20 requests/day free tier limit
- Wait until midnight (Pacific time) for quota to reset
- Check usage at https://ai.dev/rate-limit

**Health check shows ❌ Pipeline status:**
- Make sure you have the latest `backend/routes/pipeline.js` — the old version had `adminAuth` blocking the public GET /status route

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup guide, how to add schemes, eligibility engine documentation, and PR guidelines.

## License

MIT