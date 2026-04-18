# Session Changelog — 2026-04-17 → 2026-04-18

Branch: `feat/complete-backend` → PR #1

---

## 1. Backend foundation (completed)

| Change | Tested? | Result |
|---|---|---|
| `ml_service.py` wrapper around `ml/scripts/*.py` with graceful fallbacks | Yes (curl) | Pass |
| `routers/ml.py` — `estimate-rl`, `detect-signs`, `upload-measurement`, `predict/{id}` | Yes (curl) | Pass |
| `routers/maintenance.py` — full CRUD + `auto-generate` for critical assets | Yes (curl) | Pass (27 orders auto-created in test) |
| `routers/qr.py` — payload / PNG image / decode round-trip | Yes (curl) | Pass (PNG 730×730, decode match=true) |
| PDF reports (IRC-67, IRC-35, Monthly Trend) via `reportlab` | Yes (curl) | Pass (3.2 KB / 3.3 KB / 2.4 KB PDFs) |
| Excel work-order export via `openpyxl` | Yes (curl) | Pass (5.7 KB XLSX) |
| `/api/dashboard/predict/{id}` forecast endpoint | Yes (curl) | Pass (49 series points, failure date returned) |
| `lifespan` migration (away from deprecated `@app.on_event`) | Yes (boot) | Pass |
| `/uploads` static mount for serving uploaded images | Yes (curl) | Pass |
| Fix: `detect_signs` kwarg (`n_objects` → `n_detections`) + shape normalization | Yes (curl) | Pass after fix |
| Fix: lazy ML imports to avoid `ml/models/` shadowing `backend/models.py` | Yes (boot) | Pass |

## 2. Branch consolidation (completed)

| Change | Tested? | Result |
|---|---|---|
| Merged `claude/review-remaining-tasks-N4qWO` (frontend camera capture + `/api/uploads`) into `feat/complete-backend` | Yes (boot, curl) | Pass |
| Resolved `main.py` conflict — kept lifespan + all 4 new routers + single `/uploads` mount | Yes (boot) | Pass |

## 3. Postgres support — Phase A (completed)

| Change | Tested? | Result |
|---|---|---|
| `database.py` reads `DATABASE_URL` env var; SQLite fallback | Yes (both) | Pass — SQLite and Postgres URLs both resolve |
| `pool_pre_ping` for Postgres dropped-connection detection | No direct test | — |
| `docker-compose.yml` with `postgres:16-alpine` | Yes (by user) | Pass (`docker ps` shows healthy) |
| `backend/.env.example` + `python-dotenv` auto-load in `main.py` | Yes (by user) | Pass |
| Seed runs against Postgres on first boot | Yes (by user) | Pass (`TRUNCATE` + restart + reseed worked) |
| `SEED_DEMO=0` toggle to disable demo seed | Yes (by user) | Pass (empty DB after truncate + flag) |

## 4. Real-world use cases — Phase B (in progress)

### Done

| Change | Tested? | Result |
|---|---|---|
| `POST /api/assets` single-asset create | Yes (curl + UI) | Pass |
| `GET /api/assets/import/template` — downloadable CSV with 10 example rows | Yes (curl + UI) | Pass |
| `POST /api/assets/import` — bulk CSV import with per-row validation | Yes (curl + UI) | Pass (3 created / 2 skipped in curl test; user import in UI worked) |
| `POST /api/assets/import/force` — override path for flagged duplicates | Partially — logic tested via UI "Insert selected" button | Pass |
| Duplicate detection: `(highway_id, asset_type)` + chainage ±0.01 km (~10m) | Yes (UI) | Pass — user confirmed "duplicate management is good" |
| Within-file duplicate detection | Logic-only, not explicitly exercised in UI | Untested |
| Frontend: Add asset / Import / Export / Refresh buttons on `/assets` | Yes (UI) | Pass — Refresh initially broken, fixed, now working |
| Frontend: Overview page + Sidebar wired to live backend data | Yes (UI) | Pass (stats, alerts count, asset count, recent activity) |

### Not yet done

- Operator authentication (JWT, roles)
- Audit log
- Shapefile / GeoJSON export (the `/api/assets/map` GeoJSON feed exists but isn't surfaced as a download)

## 5. Layer 2 — CCTV / dashcam async ingestion (backend done; UI built; real video untested)

| Change | Tested? | Result |
|---|---|---|
| Synchronous `POST /api/ml/ingest-video` v1 | Synthetic cv2 video | Pass (deprecated in favor of async below) |
| `JobRun` model — tracks every ingestion (source, status, params, result, timings, error) | Yes (boot + curl) | Pass |
| `POST /api/ingest/video` — returns 202 + job_id immediately; work runs in BackgroundTask | Yes (curl) | Pass (queued → running → done in ~1s, 8 measurements persisted) |
| `GET /api/ingest/jobs` and `/jobs/{id}` polling endpoints | Yes (curl) | Pass |
| Frontend `/ingest` page — upload form + live jobs list polling every 3s | Built | Renders; not yet exercised by user with a real video |
| Sidebar: "Video ingest" nav item under Operations | Built | Visible |

**Architectural notes:**
- `JobRun` table is the stable contract — swapping `BackgroundTasks` for Celery/RQ/pg-boss later requires zero API changes.
- The legacy `/api/ml/ingest-video` sync endpoint remains for scripts/CI; new UI uses the async path.

**Outstanding work on Layer 2:**
1. Test with a real `.mp4` of a highway recording.
2. Asset selection by GPS proximity (frame timestamp → chainage) so one video can populate measurements across multiple assets instead of just one.
3. Upgrade from in-process `BackgroundTasks` to a proper queue when ingestion volume grows.

## 6. Layer 3 — Reference patch calibration (backend + UI done)

| Change | Tested? | Result |
|---|---|---|
| `ReferencePatch` model — label, known_rl, color, GPS/highway/chainage, cert ref, active flag | Yes (boot + curl) | Pass |
| `/api/patches` CRUD: list / create / get / update / delete | Yes (curl) | Pass |
| `POST /api/patches/calibrated-rl` — takes sign_brightness + patch_brightness + patch_id → returns absolute R_L via `known_rl / patch_brightness × sign_brightness` | Yes (curl) | Pass (500/200 × 120 = 300 R_L, classified compliant) |
| Frontend `/patches` page — CRUD table + Calibrated R_L calculator modal | Built | Renders; math round-trip verified via backend test |
| Sidebar: "Ref. patches" nav item under Data | Built | Visible |

**Architectural notes:**
- The existing uncalibrated `estimate_rl` endpoint stays for back-compat (useful when no patch is in view).
- The calibrated endpoint is the physics-anchored default going forward — UI flows should route through it when a patch is available.

**Outstanding work on Layer 3:**
1. Thread calibration into the upload / capture pipelines (`/api/ml/upload-measurement` should accept an optional `patch_id` + `patch_brightness`).
2. Auto-detect patches in images (vision task) — currently the operator supplies brightness manually.
3. Seasonal patch recertification reminder (patches themselves degrade over years).

## 7. Layer 4 — Crowdsourced dashcam (backend + UI done)

| Change | Tested? | Result |
|---|---|---|
| `Contributor` model (name, contributor_type, api_key, trust_level, active, last_used_at) | Yes | Pass |
| API key auth dependency (`require_contributor`) reading `X-API-Key` header | Yes (curl) | Pass — bogus key → 401, valid key → accepted |
| `/api/contributors` staff CRUD + `rotate-key` endpoint | Yes (curl) | Pass — key returned once on create/rotate, never again |
| `POST /api/contribute/video` — public, API-key gated, reuses async JobRun pipeline | Yes (curl) | Pass (job id=2 processed, 6 measurements created) |
| `Measurement.contributor_id` FK + trust-level confidence weighting | Yes (curl) | Pass — confidence 0.608 × trust 0.7 = 0.426 persisted |
| `JobRun.contributor_id` FK — attribution on every ingestion | Yes (curl) | Pass |
| Postgres schema migration (added `contributor_id` columns via ALTER TABLE) | Yes | Pass |
| Frontend `/contributors` page — CRUD + issue/rotate keys modal + key-shown-once flow | Built | Renders; CRUD exercised via backend |
| Sidebar: "Contributors" under Data | Built | Visible |

**Architectural notes:**
- Staff `/api/ingest/video` (full trust) and public `/api/contribute/video` (keyed, weighted) share the same async `JobRun` pipeline — zero code duplication.
- API key is only returned on create/rotate. Operator must save it then; the DB never exposes it again via list/get endpoints.
- `trust_level` multiplier applies at measurement confidence write time, so downstream aggregation (avg R_L, predict_degradation) can weight by `confidence` and get trust-aware results for free.

**Outstanding work on Layer 4:**
1. Rate limiting per API key (none yet — a fleet could spam).
2. Moderation queue before measurements hit the main asset — currently trusted directly.
3. Public-facing contributor onboarding flow (self-serve signup, not staff-issued).
4. Hash the API key at rest instead of storing plaintext (if we ever share the DB).

## 8. Summary of what's safe to demo

- Dashboard overview with real counts (`/`)
- Asset registry with Import / Add / Export / Refresh (`/assets`)
- Duplicate handling with override
- `/docs` Swagger — every endpoint callable and working
- PDF/Excel report downloads
- QR code generation for individual assets

## 9. What to flag as "not demo-ready"

- Layer 2 video ingestion (untested on real footage, no UI)
- "Hi, Madhav" greeting, calendar, workload heatmap on `/` (still placeholder)
- Inspection hours / QA pass rate KPIs on `/` (still placeholder)
