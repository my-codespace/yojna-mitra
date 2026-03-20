# Changelog

All notable changes to Yojana Mitra are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2025-03-19

### Added

**Backend**
- Express API with 9 endpoints across 5 routers (schemes, eligibility, users, pipeline, analytics)
- Mongoose models for `Scheme` (with full-text index) and `UserProfile` (with income bucket hook)
- Pure eligibility engine supporting 8 operators: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`, `range`
- AND/OR logic for eligibility rule sets with partial match scoring
- Claude AI simplification service (claude-sonnet-4) with dual-layer cache (Redis + MongoDB)
- Unified `cacheService` with automatic Redis/in-memory fallback
- Fire-and-forget analytics tracking: views, apply clicks, simplify requests, shares
- PDF ingestion pipeline: pdf-parse extraction → Tesseract OCR fallback → Claude AI structuring → MongoDB upsert
- Admin API key authentication middleware for pipeline routes
- Winston logger with JSON production format and colorized development format
- Global error handler covering Mongoose, Multer, Anthropic, and generic errors
- Rate limiting (100 req/15min per IP) and security headers (helmet)
- CORS configuration for frontend origin
- MongoDB seeder with 10 real Indian government schemes
- 35+ tests: unit tests for eligibility engine and AI simplifier, integration tests for all API routes using in-memory MongoDB

**Frontend**
- React 18 + Vite SPA with screen-based routing (no React Router dependency)
- 5-screen flow: Welcome → Profile Wizard → Results → Scheme Detail → Browse
- ProfileWizard: 5-step onboarding collecting age, gender, income bracket, state, category, occupation
- Client-side eligibility engine mirroring backend for instant feedback without network round-trip
- SchemeCard with eligibility pill (✅/⚠️/❌), match score bar, and first fail reason
- SchemeDetail with 4 tabs: Overview, How to Apply, Documents, ✨ AI Simplified
- ResultsList showing eligible schemes ranked by matchScore + collapsible partial matches
- SearchBrowse: debounced full-text search + category filter chips
- Bookmarks: localStorage-backed save/unsave with full bookmarks screen
- ShareScheme: Web Share API with WhatsApp, X/Twitter, and clipboard fallback
- AdminDashboard: drag-and-drop PDF upload, admin key field, pipeline stats
- Loading skeletons (shimmer animation) for cards, detail page, and results banner
- Toast notification system (success/error/warning/info, auto-dismiss)
- React ErrorBoundary with Hindi/English fallback UI
- Hindi/English language toggle with 50+ translated strings via LanguageContext
- Custom hooks: useSchemes, useSchemeSearch, useSchemeDetail, useEligibility, useCategories, useLocalStorage, useDebounce, useToast
- Fire-and-forget client-side analytics tracker

**DevOps & Tooling**
- Docker Compose with MongoDB 7, Redis 7.2, backend, and nginx-served frontend
- Separate Dockerfiles for backend (Alpine + poppler-utils) and frontend (Vite build → nginx)
- nginx config with SPA routing fallback and /api proxy
- PWA manifest for "Add to Home Screen" on Android/iOS
- Service worker with cache-first (app shell), network-first (API, 5-min TTL), and stale-while-revalidate (Google Fonts) strategies
- GitHub Actions CI: unit tests, integration tests, coverage upload, frontend build verification, Docker build check on main
- GitHub Actions Deploy: build and push Docker images to GHCR on merge to main
- ESLint v9 flat configs for backend (Node.js) and frontend (React + react-hooks)
- Helper scripts: `generate-admin-key.js`, `check-health.js`, `reset-cache.js`
- CONTRIBUTING.md with setup guide, scheme authoring reference, eligibility engine docs, and PR guidelines

**Schemes (10 seeded)**
- PM-KISAN Samman Nidhi (farmer, ₹6,000/yr)
- National Scholarship Portal (student, ₹1K–₹1.2L/yr)
- PM Awas Yojana Urban (housing, ₹2.67L subsidy)
- PM Ujjwala Yojana (women, free LPG)
- Atal Pension Yojana (labour, ₹1K–₹5K/month)
- PM Mudra Yojana (business, loans to ₹10L)
- Post Matric Scholarship SC/ST (student, full fees)
- PM SVANidhi (vendor, loans to ₹50K)
- Sukanya Samriddhi Yojana (women, 8.2% savings)
- Startup India Seed Fund (business, ₹50L + 3yr tax holiday)

---

## Roadmap

### [1.1.0] — Planned
- [ ] State-specific schemes (e.g. Maharashtra Ration Card, UP Kisan schemes)
- [ ] Voice input for profile wizard (Web Speech API)
- [ ] Offline scheme browsing (cache full scheme list in service worker)
- [ ] WhatsApp bot integration for zero-app access
- [ ] Scheme deadline reminders (e.g. NSP scholarship window)

### [1.2.0] — Planned
- [ ] Admin scheme editor UI (edit eligibility rules without touching seed file)
- [ ] Scheme verification status (mark outdated/discontinued schemes)
- [ ] Analytics dashboard in AdminDashboard (charts, top schemes, funnel)
- [ ] Multi-language support (Tamil, Telugu, Bengali, Kannada)
- [ ] A/B testing AI simplification prompts via feature flags