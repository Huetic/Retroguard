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

## 5. Layer 2 — CCTV / dashcam bulk ingestion (NOT TESTED)

| Change | Tested? | Result |
|---|---|---|
| `POST /api/ml/ingest-video` — samples frames, bulk-inserts measurements, updates status from mean R_L | Partially — only a synthetic 5-second cv2-generated video | Curl call returned 200 with 10 measurements created, but **real CCTV / dashcam footage has not been tested** |
| `sample_video_frames()` in `ml_service.py` (cv2-based) | Synthetic only | Untested against real video |
| `estimate_rl_from_frame()` | Synthetic only | Untested against real video |
| Frontend UI to upload video | Not built | N/A |

**Outstanding work on Layer 2:**
1. Test with a real `.mp4` of a highway recording.
2. Build an "Ingest video" UI (either on `/measure` or a new page) that hits `/api/ml/ingest-video`.
3. Consider: asset selection by GPS proximity (frame timestamp → chainage) so one video can populate measurements across multiple assets instead of just one.

## 6. Summary of what's safe to demo

- Dashboard overview with real counts (`/`)
- Asset registry with Import / Add / Export / Refresh (`/assets`)
- Duplicate handling with override
- `/docs` Swagger — every endpoint callable and working
- PDF/Excel report downloads
- QR code generation for individual assets

## 7. What to flag as "not demo-ready"

- Layer 2 video ingestion (untested on real footage, no UI)
- "Hi, Madhav" greeting, calendar, workload heatmap on `/` (still placeholder)
- Inspection hours / QA pass rate KPIs on `/` (still placeholder)
