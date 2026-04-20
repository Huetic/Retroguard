# RetroGuard — Outstanding Work

Last updated: 2026-04-18
Branch: `feat/complete-backend`

Ordered by: **blockers to public release → nice-to-haves**.
Nothing here is about hackathon demo polish — that's in `SESSION_CHANGELOG.md`.

---

## 0. Testing (before anything else ships)

### Backend

- [ ] Integration-test Layer 2 (`/api/ingest/video`) against a **real** highway video (not synthetic cv2-generated).
- [ ] Verify `sample_video_frames()` handles 10+ minute clips without memory blow-up.
- [ ] Confirm `_process_video_job` survives a uvicorn restart mid-run (spoiler: it won't — see blocker #3).
- [ ] Load-test `/api/assets/import` with a 10k-row CSV.
- [ ] Fuzz-test `/api/qr/decode` with malformed payloads.
- [ ] Verify Postgres foreign-key cascades behave as expected on delete (contributor → measurements, asset → forecasts, etc).
- [ ] Unit tests for `predict_degradation` against known-decay inputs.
- [ ] Write pytest scaffolding — we have zero automated tests today.

### Frontend

- [ ] Click every page, every button, every modal. Log each bug.
- [ ] Test Import CSV with: empty file, wrong headers, 1 row, 10k rows, non-UTF8, BOM-prefixed.
- [ ] Test Add asset with invalid GPS (lat 999, lon -900).
- [ ] Test force-insert duplicate flow end-to-end.
- [ ] `/forecast` with no measurements → should show the empty state, not crash.
- [ ] `/ingest` → upload real video → verify live polling shows queued → running → done.
- [ ] `/qr` → print PDF, verify QR scans correctly in a phone camera.
- [ ] `/contributors` → create + rotate key → verify old key returns 401.
- [ ] `/patches` calibrated-R_L math: cross-check calculator output against manual formula.
- [ ] Responsive check at 1280, 1024, 768, 390 (mobile).
- [ ] Accessibility: tab-through every page, check focus rings, ARIA labels.

### E2E

- [ ] Full hackathon demo script walkthrough: import CSV → add patch → upload video → check forecast → print QRs → scan to log measurement → generate compliance PDF.

---

## 1. Must-fix blockers (true stop-ships for public release)

### Security / auth

- [x] **Staff authentication** — JWT bearer-token, `POST /api/auth/login` → `TokenResponse`. (`backend/auth.py`, `backend/routers/auth.py`)
- [x] **Role model** — inspector / supervisor / admin. Applied to all write endpoints. (`backend/auth.py` `require_role`, `backend/routers/users.py`)
- [ ] Hash API keys at rest (currently plaintext in `contributors.api_key`).

### Resolved

- **CSRF protection** — N/A under bearer-token auth; would only be needed if we add cookie sessions.

- [ ] Tighten CORS — currently `allow_origins=["*"]`. Scope to known frontend origins.
- [ ] Rate-limit public endpoints (`/api/contribute/*`, `/api/qr/decode`).

### Data / ops

- [ ] **Alembic migrations** — every schema change today needs a manual `ALTER TABLE`. This will bite us on the first prod deploy.
- [ ] **Durable job queue** — swap FastAPI `BackgroundTasks` for Celery / RQ / pg-boss. Jobs currently die with the process.
- [ ] **Janitor** — sweep `JobRun` rows stuck in `running` > 10 min and mark failed.
- [ ] Secret management — move `DATABASE_URL` and any API keys out of plaintext `.env`. Vault / AWS SSM / equivalent.
- [ ] Backup policy for Postgres (daily snapshots, PITR).

### Deploy

- [ ] Dockerfile for backend.
- [ ] Dockerfile for frontend.
- [ ] CI pipeline (lint, typecheck, test, build).
- [ ] Staging environment separate from prod.
- [ ] Health endpoint that actually checks DB connectivity, not just `{"status":"ok"}`.

---

## 2. Government-specific blockers (NHAI is the customer)

- [ ] Deploy target must be **NIC MeghRaj** (Indian gov cloud), not AWS / Vercel.
- [ ] **Audit log** — every write op (create asset, update asset, resolve alert, issue API key, force-insert duplicate) persisted with actor + timestamp. Legal requirement.
- [ ] PII pipeline on dashcam uploads: face + license plate blurring before storage.
- [ ] Data retention policy — how long do raw videos live? Where do measurements go after the asset is decommissioned?
- [ ] **Accessibility (WCAG 2.1 AA)** — mandatory for Indian gov sites. Contrast, keyboard nav, ARIA, screen reader.
- [ ] Hindi + regional-language i18n.
- [ ] Data classification labels — which fields are public / restricted / PII.
- [ ] Vulnerability disclosure / responsible-disclosure policy.

---

## 3. ML quality blockers

- [ ] **Real-world validation** — compare predicted vs measured R_L decay against a calibrated handheld retroreflectometer on at least one highway corridor.
- [ ] Fine-tune sign detector on Indian road sign dataset. Current YOLO-on-COCO only really detects stop signs and traffic lights; rest simulated.
- [ ] Model-accuracy backtest: compare past `Forecast` snapshots to the measurements that later came in. Drives trust.
- [ ] Reference patch auto-detection (Layer 3) — currently operator supplies `patch_brightness` manually.
- [ ] Asset-matching from GPS: a dashcam video should produce measurements across multiple nearby assets, not just the one `asset_id` the uploader picked.

---

## 4. Operational polish

- [ ] Error tracking — Sentry or equivalent.
- [ ] Structured logging (JSON), not print.
- [ ] Prometheus + Grafana metrics.
- [ ] Alerting on job-failure spikes, auth failures, 5xx rate.
- [ ] `/uploads/` should go to object storage (S3 / MinIO) and be served via signed URLs, not local disk.
- [ ] Admin UI for managing NHAI staff users.
- [ ] Key-rotation reminder emails / notifications.
- [ ] Bulk-delete guards (confirm phrase, undo window).

---

## 5. Known rough edges (not release blockers, but worth fixing)

- [ ] Overview (`/`) page still has placeholder copy: "Hi Madhav", calendar, workload heatmap, inspection hours / QA KPIs.
- [ ] `/measure` page hasn't been touched since the branch merge — verify Capture flow still works after the uploads changes.
- [ ] Crumb sync: `TopBar` crumb text is hand-coded per page; drift is inevitable.
- [ ] Refresh button animation on `/assets` flickers when query returns fast.
- [ ] `/forecast` "Within N days" filter applies client-side after sort — should push to backend for big fleets.
- [ ] Scheduling forecasts: no cron / scheduled task yet. Forecasts only refresh when someone clicks the button.

---

## 6. Nice-to-haves (post-MVP)

- [ ] QR tamper-detection via signed payloads (NHAI-issued keypair).
- [ ] Per-asset "forecast drift" chart showing how predictions changed over time.
- [ ] Shapefile / GeoJSON export for NHAI GIS team.
- [ ] `/measure` page wiring calibration: if a patch is in view, auto-calibrate before logging.
- [ ] Fleet-level alerts dashboard.
- [ ] Email / SMS digests for critical-status assets.
- [ ] Multi-tenant: one instance for multiple states / authorities.
