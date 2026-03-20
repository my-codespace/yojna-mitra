# Production Deployment Checklist

Step-by-step checklist before and after deploying Yojana Mitra to production.

---

## Pre-deployment

### Environment variables
- [ ] `ANTHROPIC_API_KEY` set to a valid production key
- [ ] `ADMIN_API_KEY` set to a strong random key (`npm run gen:admin-key`)
- [ ] `MONGODB_URI` points to a production MongoDB instance (Atlas recommended)
- [ ] `REDIS_URL` set for production caching (`redis://redis:6379` or managed Redis)
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` set to the actual frontend domain
- [ ] `VITE_API_URL` set in `frontend/.env` to the actual API URL

### Database
- [ ] Run `npm run migrate:indexes` against the production database
- [ ] Run `npm run seed` to populate the 15 schemes (if fresh database)
- [ ] Verify text search index created: `db.schemes.getIndexes()`

### Security
- [ ] `ADMIN_API_KEY` is at least 32 characters (use `npm run gen:admin-key`)
- [ ] CORS `FRONTEND_URL` matches production domain exactly (no trailing slash)
- [ ] Rate limiting configured appropriately (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`)
- [ ] SSL/TLS termination in place (via nginx, load balancer, or hosting provider)
- [ ] MongoDB firewall rules restrict access to backend service only
- [ ] Redis is not publicly accessible

### Build
- [ ] Frontend built with production API URL: `VITE_API_URL=https://api.yourdomain.com/api npm run build`
- [ ] Backend Docker image built and pushed: `docker build -f Dockerfile.backend .`
- [ ] Frontend Docker image built and pushed: `docker build -f Dockerfile.frontend ./frontend`

---

## Deployment

```bash
# Pull and start with docker-compose
docker-compose pull
docker-compose up -d

# Run database migrations
docker exec yojana-backend node scripts/migrate-indexes.js

# Seed schemes (first deploy only)
docker exec yojana-backend node backend/services/seedDatabase.js

# Verify health
npm run health -- --url https://api.yourdomain.com
```

---

## Post-deployment verification

### API health
- [ ] `GET /health` returns `{ status: "ok", db: "connected" }`
- [ ] `GET /api/schemes` returns 15 schemes
- [ ] `GET /api/pipeline/status` returns correct totalSchemes count
- [ ] `POST /api/eligibility` with sample profile returns results

### Frontend
- [ ] App loads at production URL
- [ ] Profile wizard completes successfully
- [ ] Results screen shows matching schemes
- [ ] Scheme detail page loads correctly
- [ ] AI simplification works (✨ Simple tab)
- [ ] Search returns results
- [ ] Hindi language toggle works

### PWA
- [ ] "Add to Home Screen" prompt appears on Android Chrome
- [ ] App loads when offline (shows cached schemes)
- [ ] Service worker registered (check DevTools → Application → Service Workers)

### Analytics
- [ ] `GET /api/analytics/platform` returns event counts after browsing

---

## Monitoring & Maintenance

### Log locations (Docker)
```bash
docker logs yojana-backend --follow
docker logs yojana-frontend --follow
```

### Useful commands
```bash
# Clear AI simplification cache after prompt updates
docker exec yojana-backend node scripts/reset-cache.js

# Check health
docker exec yojana-backend node scripts/check-health.js

# Ingest a new scheme PDF
curl -X POST https://api.yourdomain.com/api/pipeline/ingest \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -F "pdf=@path/to/scheme.pdf"
```

### MongoDB backup (Atlas)
- Enable automated backups in Atlas (daily recommended)
- Test restore procedure quarterly

### Scaling
- Backend is stateless — can scale horizontally behind a load balancer
- Ensure `REDIS_URL` points to a shared Redis instance (not per-container)
- MongoDB Atlas auto-scales with M10+ tier

---

## Rollback

```bash
# Rollback to previous image
docker-compose stop backend
docker pull ghcr.io/your-org/yojana-mitra/backend:PREVIOUS_SHA
docker-compose up -d backend

# Verify
npm run health -- --url https://api.yourdomain.com
```