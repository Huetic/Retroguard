# ============================================================
#  RetroGuard - Start Script (Windows PowerShell)
#  6th NHAI Innovation Hackathon 2026
# ============================================================
#
#  Usage (from PowerShell, in the submission folder):
#    .\run.ps1            Start backend + frontend (default)
#    .\run.ps1 backend    Start backend only
#    .\run.ps1 frontend   Start frontend only
#    .\run.ps1 reset      Wipe DB + stop servers
#    .\run.ps1 stop       Stop running servers
#    .\run.ps1 status     Show service status
#
#  If you see "running scripts is disabled", run this first
#  in the same PowerShell window (safe, session-only):
#    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#
#  Default login:  admin / admin  (change in production)
#  Backend:        http://localhost:8000  (API docs at /docs)
#  Frontend:       http://localhost:3000
# ============================================================

param(
    [string]$Command = "all"
)

$ErrorActionPreference = "Stop"

$ProjDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjDir "backend"
$FrontendDir = Join-Path $ProjDir "frontend"
$PidDir      = Join-Path $ProjDir ".pids"

New-Item -ItemType Directory -Force -Path $PidDir | Out-Null

function Banner {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "  RetroGuard - AI-Powered Retroreflectivity"       -ForegroundColor Cyan
    Write-Host "  6th NHAI Innovation Hackathon 2026"              -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Log  ($msg) { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn ($msg) { Write-Host "  [!]   $msg" -ForegroundColor Yellow }
function Err  ($msg) { Write-Host "  [X]   $msg" -ForegroundColor Red }
function Step ($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor White }

# ----------------------------------------------------
# Python detection — prefer python, fall back to py
# ----------------------------------------------------
function Get-Python {
    if (Get-Command python -ErrorAction SilentlyContinue) { return "python" }
    if (Get-Command py -ErrorAction SilentlyContinue)     { return "py -3" }
    Err "Python 3 not found. Install from https://www.python.org/ and re-run."
    exit 1
}

function Get-Node {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Err "Node.js not found. Install from https://nodejs.org/ (LTS) and re-run."
        exit 1
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Err "npm not found. Reinstall Node.js with the default installer options."
        exit 1
    }
}

# ----------------------------------------------------
# Port helpers
# ----------------------------------------------------
function Kill-Port ($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}

function Wait-Http ($url, $timeoutSec) {
    for ($i = 0; $i -lt $timeoutSec; $i++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    return $false
}

# ----------------------------------------------------
# Backend setup
# ----------------------------------------------------
function Setup-Backend {
    Step "1/4" "Setting up Python backend..."

    Push-Location $BackendDir
    try {
        $py = Get-Python

        if (-not (Test-Path "venv")) {
            Log "Creating virtual environment..."
            & $py.Split(" ")[0] $py.Split(" ")[1..($py.Split(" ").Length - 1)] -m venv venv
        }

        $activate = Join-Path $BackendDir "venv\Scripts\Activate.ps1"
        if (-not (Test-Path $activate)) {
            Err "venv activation script missing at $activate"
            exit 1
        }
        & $activate
        Log "Activated venv"

        $core = "fastapi uvicorn[standard] sqlalchemy pydantic python-multipart aiofiles numpy pandas httpx python-jose[cryptography] bcrypt jinja2 python-dotenv reportlab openpyxl qrcode[pil] alembic pytest slowapi python-json-logger Pillow scipy scikit-learn"

        $check = python -c "import fastapi, alembic, jose, bcrypt" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Log "Installing core dependencies (may take a few minutes)..."
            pip install -q $core.Split(" ") | Out-Null
        } else {
            Log "Core dependencies already installed"
        }

        $torchCheck = python -c "import torch" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Warn "PyTorch not installed - ML endpoints will use simulation mode"
            Warn "To install: pip install torch torchvision ultralytics opencv-python-headless"
        }

        if (-not (Test-Path ".env")) {
            Log "Creating .env (SQLite mode)..."
            @"
# RetroGuard backend - local SQLite config
SEED_DEMO=1
JWT_SECRET=hackathon-demo-secret-change-in-prod
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3005
"@ | Out-File -Encoding UTF8 -FilePath ".env"
        }
        Log ".env configured"

        New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
        Log "Uploads directory ready"

        deactivate 2>$null
    }
    finally {
        Pop-Location
    }
}

# ----------------------------------------------------
# Frontend setup
# ----------------------------------------------------
function Setup-Frontend {
    Step "2/4" "Setting up Next.js frontend..."

    Get-Node
    Push-Location $FrontendDir
    try {
        if (-not (Test-Path "node_modules")) {
            Log "Installing npm dependencies (this takes a minute)..."
            npm install --silent
        } else {
            Log "node_modules already present"
        }

        if (-not (Test-Path ".env.local")) {
            "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -Encoding UTF8 -FilePath ".env.local"
            Log "Created .env.local"
        } else {
            Log ".env.local exists"
        }
    }
    finally {
        Pop-Location
    }
}

# ----------------------------------------------------
# Start backend / frontend as background jobs
# ----------------------------------------------------
function Start-Backend {
    Step "3/4" "Starting FastAPI backend (port 8000)..."

    Kill-Port 8000

    $activate = Join-Path $BackendDir "venv\Scripts\Activate.ps1"
    $proc = Start-Process -FilePath "powershell" `
        -ArgumentList "-NoProfile", "-Command", "& '$activate'; python '$BackendDir\main.py'" `
        -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden

    $proc.Id | Out-File -Encoding ASCII -FilePath (Join-Path $PidDir "backend.pid")

    if (Wait-Http "http://localhost:8000/health" 45) {
        Log "Backend ready (PID $($proc.Id))"
        Log "API docs:  http://localhost:8000/docs"
        Log "Health:    http://localhost:8000/health"
    } else {
        Err "Backend failed to start within 45s"
        exit 1
    }
}

function Start-Frontend {
    Step "4/4" "Starting Next.js frontend (port 3000)..."

    Kill-Port 3000

    $proc = Start-Process -FilePath "cmd" `
        -ArgumentList "/c", "npm run dev" `
        -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden

    $proc.Id | Out-File -Encoding ASCII -FilePath (Join-Path $PidDir "frontend.pid")

    if (Wait-Http "http://localhost:3000" 60) {
        Log "Frontend ready (PID $($proc.Id))"
        Log "Dashboard:  http://localhost:3000"
    } else {
        Err "Frontend failed to start within 60s"
        exit 1
    }
}

# ----------------------------------------------------
# Stop / reset / status
# ----------------------------------------------------
function Stop-All {
    Step "-" "Stopping RetroGuard..."

    foreach ($name in @("backend", "frontend")) {
        $file = Join-Path $PidDir "$name.pid"
        if (Test-Path $file) {
            $id = Get-Content $file
            try {
                Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
                Log "$name stopped"
            } catch {
                Warn "$name was not running"
            }
            Remove-Item $file -Force
        }
    }

    Kill-Port 8000
    Kill-Port 3000

    Log "All services stopped"
}

function Reset-Db {
    Step "-" "Resetting database..."

    Push-Location $BackendDir
    try {
        Remove-Item -Force -ErrorAction SilentlyContinue "retroguard.db", "retroguard.db-journal"
        Log "Deleted old database"
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "alembic\versions\__pycache__"
        Log "Cleared migration cache"
        Log "Database will be recreated on next backend start"
    }
    finally {
        Pop-Location
    }
}

function Check-Status {
    Step "-" "RetroGuard service status"

    try {
        Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
        Log "Backend:  RUNNING"
    } catch {
        Err "Backend:  NOT RUNNING"
    }

    try {
        Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 | Out-Null
        Log "Frontend: RUNNING"
    } catch {
        Err "Frontend: NOT RUNNING"
    }
}

# ----------------------------------------------------
# Main dispatch
# ----------------------------------------------------
Banner

switch ($Command.ToLower()) {
    "all" {
        Setup-Backend
        Setup-Frontend
        Start-Backend
        Start-Frontend

        Write-Host ""
        Write-Host "==================================================" -ForegroundColor White
        Write-Host "  RetroGuard is running!"                          -ForegroundColor Green
        Write-Host ""
        Write-Host "  Dashboard:  http://localhost:3000"
        Write-Host "  API Docs:   http://localhost:8000/docs"
        Write-Host "  Login:      admin / admin"
        Write-Host ""
        Write-Host "  Press Ctrl+C here to stop all services"           -ForegroundColor Yellow
        Write-Host "==================================================" -ForegroundColor White
        Write-Host ""

        try {
            while ($true) { Start-Sleep -Seconds 5 }
        }
        finally {
            Stop-All
        }
    }
    "backend"  { Setup-Backend;  Start-Backend;  Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow; try { while ($true) { Start-Sleep 5 } } finally { Stop-All } }
    "frontend" { Setup-Frontend; Start-Frontend; Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow; try { while ($true) { Start-Sleep 5 } } finally { Stop-All } }
    "reset"    { Stop-All; Reset-Db }
    "stop"     { Stop-All }
    "status"   { Check-Status }
    default {
        Write-Host "Usage: .\run.ps1 [all|backend|frontend|reset|stop|status]"
        Write-Host ""
        Write-Host "  all       Setup + start backend & frontend (default)"
        Write-Host "  backend   Start backend only (port 8000)"
        Write-Host "  frontend  Start frontend only (port 3000)"
        Write-Host "  reset     Wipe database + stop servers"
        Write-Host "  stop      Stop all running servers"
        Write-Host "  status    Check if servers are running"
        Write-Host ""
        Write-Host "Default login: admin / admin"
    }
}
