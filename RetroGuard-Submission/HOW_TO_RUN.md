# How to Run RetroGuard

_6th NHAI Innovation Hackathon 2026 — Madhav Dogra & Aaditya Gaur_

This bundle contains the full RetroGuard prototype (FastAPI backend + Next.js
frontend), the research paper (`docs/RetroGuard-Paper.pdf`), and boot scripts
for macOS, Linux, and Windows.

---

## 1. Prerequisites

Install these once, then skip to Section 2.

| Tool        | Version  | Check with          |
|-------------|----------|---------------------|
| Python      | 3.10+    | `python3 --version` |
| Node.js     | 18+ LTS  | `node --version`    |
| npm         | 9+       | `npm --version`     |
| git         | any      | `git --version`     |

- **macOS:** `brew install python@3.11 node` (requires [Homebrew](https://brew.sh))
- **Ubuntu/Debian:** `sudo apt install python3 python3-venv python3-pip nodejs npm`
- **Windows:** install Python from <https://python.org> (tick _“Add to PATH”_)
  and Node.js LTS from <https://nodejs.org>.

_PyTorch / YOLOv8 are **optional**. If they are not installed the backend
falls back to deterministic simulation for ML endpoints — the demo still
works end-to-end. To enable real ML:_
`pip install torch torchvision ultralytics opencv-python-headless`

---

## 2. Run (one command)

### macOS / Linux

```bash
chmod +x run.sh
./run.sh
```

### Windows (PowerShell)

```powershell
# If PowerShell refuses to run the script, unblock for this session only:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\run.ps1
```

The first run takes 2–5 minutes (it creates a Python virtualenv, installs
backend dependencies, and runs `npm install`). Subsequent runs start in
seconds.

When you see the banner

```
RetroGuard is running!
Dashboard:  http://localhost:3000
API Docs:   http://localhost:8000/docs
Login:      admin / admin
```

open <http://localhost:3000> in your browser.

Press **Ctrl+C** in the terminal to stop both servers.

---

## 3. What the script does

| Step | Action                                                     |
|------|------------------------------------------------------------|
| 1    | Creates `backend/venv` and installs backend dependencies   |
| 2    | Creates `backend/.env` (SQLite mode, demo JWT secret)      |
| 3    | Runs `npm install` inside `frontend/` if needed            |
| 4    | Creates `frontend/.env.local` pointing at `localhost:8000` |
| 5    | Starts FastAPI on **:8000** — runs Alembic migrations      |
|      | and seeds 200 demo assets on first boot                    |
| 6    | Starts Next.js dev server on **:3000**                     |

---

## 4. Additional commands

```bash
./run.sh backend   # API only (port 8000)
./run.sh frontend  # UI only (port 3000)
./run.sh reset     # wipe DB, stop servers (clean slate)
./run.sh stop      # stop everything
./run.sh status    # quick health check
```

The `run.ps1` Windows script supports the same sub-commands:
`.\run.ps1 backend | frontend | reset | stop | status`.

---

## 5. Default credentials

```
Username: admin
Password: admin
```

Additional staff users (inspector, supervisor, admin) can be created from
the `/admin` page once you log in.

---

## 6. Where things live

```
RetroGuard-Submission/
├── backend/              FastAPI + SQLAlchemy + Alembic (Python)
│   ├── main.py           App entrypoint (uvicorn)
│   ├── routers/          Auth, assets, alerts, measurements, reports, etc.
│   ├── models.py         SQLAlchemy ORM models
│   ├── schemas.py        Pydantic request/response schemas
│   ├── alembic/          DB migrations
│   ├── seed_data.py      Demo data for 200 assets across 5 corridors
│   └── requirements.txt
├── frontend/             Next.js 16 + React 19 + Tailwind v4 (TypeScript)
│   └── src/app/          Dashboard, map, alerts, assets, measure, etc.
├── ml/                   Training & inference scripts (YOLOv8 + R_L regressor)
├── latex/                Research paper source (.tex + figures)
├── docs/
│   └── RetroGuard-Paper.pdf    Compiled research paper (29 pages)
├── docker-compose.yml    Optional: full-stack docker boot
├── run.sh                macOS / Linux run script
├── run.ps1               Windows PowerShell run script
├── HOW_TO_RUN.md         This file
└── README.md             Short project overview
```

---

## 7. Docker alternative (optional)

If you have Docker Desktop installed:

```bash
docker compose up --build
```

Same ports: API on 8000, UI on 3000. The container uses SQLite by default;
set `DATABASE_URL` in the compose file to point at Postgres for production.

---

## 8. Troubleshooting

| Problem                             | Fix                                                |
|-------------------------------------|----------------------------------------------------|
| `port 8000 already in use`          | `./run.sh stop` (or `.\run.ps1 stop`)              |
| Frontend blank / API 404            | Check `backend/.env` and `frontend/.env.local`     |
| `python3: command not found`        | Windows: use `py -3`; macOS: `brew install python` |
| Alembic migration error             | `./run.sh reset` to wipe the SQLite DB             |
| `Set-ExecutionPolicy` error (Win)   | Run the policy command in Section 2 first         |
| Login fails                         | Default is `admin` / `admin`                       |

Full log for the backend is written to `backend/retroguard.log` when the
server is running.

---

## 9. Contact

| Author         | Email                          |
|----------------|--------------------------------|
| Madhav Dogra   | madhavdogra@gmail.com          |
| Aaditya Gaur   | aaditya2605@gmail.com          |

Submitted to the 6th NHAI Innovation Hackathon 2026.
