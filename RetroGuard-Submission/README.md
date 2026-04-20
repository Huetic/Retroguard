# RetroGuard

**AI-Powered Retroreflectivity Assessment for Indian National Highways**
_6th NHAI Innovation Hackathon 2026_
_Authors: Madhav Dogra · Aaditya Gaur_

---

## What's in this bundle

- `docs/RetroGuard-Paper.pdf` — the full research paper (29 pages, with
  prototype screenshots embedded)
- `frontend/` — Next.js 16 command centre (dashboard, map, alerts, assets,
  field capture, forecast, compliance)
- `backend/` — FastAPI + SQLAlchemy REST API with Alembic migrations,
  JWT auth, and role-gated admin
- `ml/` — YOLOv8 detection + CNN regression training/inference scripts
- `latex/` — research paper LaTeX source
- `run.sh` — one-command boot for macOS / Linux
- `run.ps1` — one-command boot for Windows (PowerShell)
- `docker-compose.yml` — optional containerised boot

## Quick start

**macOS / Linux**

```bash
./run.sh
```

**Windows (PowerShell)**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\run.ps1
```

Then open <http://localhost:3000> and log in with `admin` / `admin`.

Full setup, troubleshooting, and architecture notes are in
[`HOW_TO_RUN.md`](./HOW_TO_RUN.md).

## System overview

RetroGuard is a six-layer platform that replaces slow, dangerous handheld
retroreflectometer measurements with continuous, network-wide monitoring:

1. **Smartphone retroreflectometer** with calibrated flash/camera optics
2. **Existing CCTV footage mining** using vehicle-headlight reflections
3. **Retroreflective reference patches** for universal camera calibration
4. **Crowdsourced dashcam network** leveraging fleet vehicles
5. **Predictive digital twin** with ML-based $R_L$ degradation forecasting
6. **Degradation-encoding QR codes** embedded in new signs at manufacture

See the paper for the mathematical foundations, cost-benefit analysis, and
phased deployment roadmap.
