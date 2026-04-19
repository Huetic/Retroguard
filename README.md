# RetroGuard

**AI-Powered Retroreflectivity Assessment for Indian National Highways**
*6th NHAI Innovation Hackathon 2026*

RetroGuard replaces dangerous, slow, and expensive handheld retroreflectivity measurement with six synergistic technology layers — a digital twin of every sign, marking, and delineator on the national highway network, predicting failure before it happens.

---

## The six layers

| # | Layer | What it does | Where it lives |
|---|---|---|---|
| 1 | **Smartphone Retroreflectometer** | Field inspector takes a phone photo → backend estimates R_L → logs a measurement. | `/measure` |
| 2 | **CCTV Footage Mining** | Upload a highway CCTV clip → async pipeline samples frames → bulk-inserts measurements. | `/ingest` |
| 3 | **Retroreflective Reference Patches** | Lab-certified patches placed in the camera's view anchor absolute R_L to physics (no drift across lighting/weather/camera). | `/patches` |
| 4 | **Crowdsourced Dashcam Network** | External partners (fleets, civic groups) upload dashcam video via API key. Measurements are attributed + trust-weighted. | `/contributors` |
| 5 | **Predictive Digital Twin** | Exponential-decay × environmental factors → risk register of which assets fall below IRC minimum, when. | `/forecast` |
| 6 | **Degradation-Encoding QR Codes** | Print bulk QR sheets, stick on signs, scan in the field to log one-shot measurements. | `/qr` |

All six layers have a working backend endpoint AND a frontend page.

---

## Quick start

### Prerequisites
- Docker Desktop (recommended path), OR
- Python 3.12 + Node 20 for local dev

### Option A — full stack via Docker Compose

```bash
docker compose up --build
```
→ frontend at **http://localhost:3000**
→ backend API docs at **http://localhost:8000/docs**

Postgres, backend, and frontend all come up, in that order, with healthcheck chaining.

### Option B — local dev

```bash
./start.sh          # backend + frontend in parallel (auto-detects Python/Node)
./start.sh reset    # wipe DB and restart fresh
./start.sh stop     # kill running servers
./start.sh status   # check what's running
```

Or piece by piece:
```bash
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
```bash
cd frontend && npm install && npm run dev
```

---

## Default login

```
username: admin
password: admin
```

The default admin is seeded on first boot if the `users` table is empty. The backend logs a WARNING on every startup until this account is rotated. **Before any non-local deploy, create a new admin account via `/admin` and deactivate the default.**

---

## Feature surface

### Asset management (`/assets`)
- Full CRUD with filters, sort, pagination, search
- **Import CSV** — bulk-upload, validates each row, flags duplicates for operator override
- **Export CSV** — current filtered view
- Single-asset "Add" form

### Live alerts (`/alerts`)
- Auto-generated when R_L crosses IRC thresholds
- Resolve from the UI
- Notification bell in the top bar (auto-polls)

### Corridor map (`/map`)
- Leaflet map of every monitored asset on NH-48, NH-44, NH-27, NH-66, DME
- Color-coded: green (compliant) / yellow (warning) / red (critical)

### Compliance (`/reports`)
- Downloadable IRC-67 and IRC-35 PDF reports per highway
- Monthly trend analysis PDF
- Maintenance work order Excel export

### Admin (`/admin` — admin role only)
- Staff user CRUD with three roles: `admin` / `supervisor` / `inspector`
- Issue, rotate, and revoke contributor API keys

### Global shortcuts
- **⌘K / Ctrl+K** — command-palette search across pages, assets, and alerts

---

## Architecture

```
┌───────────────────┐                  ┌───────────────────┐
│  Next.js 16 SPA   │   REST + JWT     │  FastAPI (Python) │
│  /map /assets …   │ ───────────────▶ │  routers/*        │
│  Tailwind · Leaflet│◀─── 36 endpoints │  auth · rate-limit│
│  Recharts · ⌘K    │                  │  janitor · logs   │
└───────────────────┘                  └────────┬──────────┘
                                                │ SQLAlchemy + Alembic
                                                ▼
                                       ┌───────────────────┐
                                       │  Postgres 16      │
                                       │  (SQLite fallback)│
                                       └───────────────────┘
                                                │
                                                ▼
                                       ┌───────────────────┐
                                       │  Storage backend  │
                                       │  (filesystem now, │
                                       │   S3/MinIO-ready) │
                                       └───────────────────┘
```

### Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS, Leaflet, Recharts, lucide-react |
| Backend | FastAPI, SQLAlchemy 2, Alembic, python-jose (JWT), passlib (bcrypt), slowapi, python-json-logger |
| ML | YOLOv8, PyTorch, OpenCV, scipy (exp-decay curve fit), reportlab, openpyxl |
| Storage | Postgres 16 (default) or SQLite; local filesystem for uploads (swap-in S3 interface ready) |
| Infra | Docker + Docker Compose, GitHub Actions CI |

### Security / ops posture

- JWT bearer-token staff auth; three roles (admin/supervisor/inspector) gate write endpoints
- SHA-256-hashed contributor API keys (plaintext shown exactly once on creation/rotation)
- Rate limits on public endpoints (slowapi): `/contribute/video` 5/min · `/qr/decode` 20/min · `/qr/scan-measurement` 30/min
- CORS origins from env var (no `*`)
- Real DB-pinging `/health` endpoint (503 on failure)
- Structured JSON logging
- Alembic migrations (runtime `upgrade head` on boot)
- Background-job janitor heals stuck JobRuns on startup + every 5 min

---

## Project layout

```
.
├── backend/                    FastAPI app
│   ├── main.py                 lifespan, migrations, router mounts
│   ├── auth.py                 JWT + roles + password hashing
│   ├── storage.py              pluggable storage backend
│   ├── rate_limit.py           slowapi limiter
│   ├── janitor.py              stuck-job sweeper
│   ├── routers/                assets · alerts · measurements · ml · ingest ·
│   │                           patches · forecast · qr · maintenance ·
│   │                           contributors · auth · users · uploads · reports
│   ├── models.py               SQLAlchemy models (10 tables)
│   ├── schemas.py              Pydantic DTOs
│   ├── alembic/                migrations
│   ├── tests/                  36 tests (unit + integration)
│   └── Dockerfile
├── frontend/                   Next.js 16 app
│   ├── src/app/                18 routes (overview, assets, map, alerts,
│   │                           measure, ingest, qr, forecast, patches,
│   │                           contributors, reports, admin, login, …)
│   ├── src/components/         TopBar, Sidebar, NotificationsBell, SearchCommand, …
│   ├── src/lib/                api client, auth context
│   └── Dockerfile
├── ml/                         ML scripts: detect_signs, estimate_rl,
│                               predict_degradation, process_cctv, generate_demo
├── latex/                      26-page research paper (PDF + source)
├── docker-compose.yml          full stack (db + backend + frontend)
├── start.sh                    unified dev runner
└── .github/workflows/ci.yml    parallel backend py_compile + frontend tsc + build
```

---

## Testing

```bash
cd backend && python -m pytest tests/
# → 36 passed
```

```bash
cd frontend && npx tsc --noEmit
# → exit 0
```

Coverage:
- 8 unit tests for `predict_degradation` (decay math, material factors, edge cases)
- 17 router integration tests against an in-memory SQLite
- 6 auth tests (login, token, expiry, rejection)
- 5 role-gate tests (inspector vs supervisor vs admin)

CI runs both suites on every push and PR.

---

## Environment variables

Copy `backend/.env.example` → `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://retroguard:retroguard@localhost:5432/retroguard
SEED_DEMO=1                                 # 0 for an empty DB on first boot
CORS_ALLOWED_ORIGINS=http://localhost:3000
JWT_SECRET=change-me-before-prod
```

Leave `DATABASE_URL` unset → SQLite fallback (`backend/retroguard.db`).
Leave everything unset → sensible dev defaults (localhost Postgres, CORS to 3000/3005, synthetic seed enabled).

---

## Research paper

See `latex/main.pdf` — 26 pages covering:
- The R_L measurement problem and current (manual) NHAI practice
- Six-layer architecture with math for each
- IRC 67 / IRC 35 compliance thresholds
- Exponential decay model with multi-factor correction
- Evaluation methodology

---

## Team

Built by the team at **[Huetic](https://huetic.com)**.

- **Madhav Dogra** · madhav@huetic.com
- **Aaditya Gaur** · aaditya@huetic.com

---

## License

Submission for the 6th NHAI Innovation Hackathon 2026.
