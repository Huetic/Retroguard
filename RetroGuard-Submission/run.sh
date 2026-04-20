#!/bin/bash
# ============================================================
#  RetroGuard — Start Script
#  6th NHAI Innovation Hackathon 2026
# ============================================================
#
#  Usage:
#    ./start.sh           Start backend + frontend (default)
#    ./start.sh backend   Start backend only
#    ./start.sh frontend  Start frontend only
#    ./start.sh reset     Wipe DB + restart fresh
#    ./start.sh stop      Kill running servers
#    ./start.sh status    Check if servers are running
#
#  Default login:  admin / admin  (change in production)
#  Backend:        http://localhost:8000  (API docs: /docs)
#  Frontend:       http://localhost:3000
# ============================================================

set -e

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJ_DIR/backend"
FRONTEND_DIR="$PROJ_DIR/frontend"
PID_DIR="$PROJ_DIR/.pids"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}║     RetroGuard — AI-Powered Retroreflectivity   ║${RESET}"
  echo -e "${CYAN}${BOLD}║     6th NHAI Innovation Hackathon 2026          ║${RESET}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
}

log()   { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET} $1"; }
err()   { echo -e "  ${RED}✗${RESET} $1"; }
step()  { echo -e "\n${BOLD}[$1]${RESET} $2"; }

mkdir -p "$PID_DIR"

# ─────────────────────────────────────────────────────
#  Setup: Python venv + deps
# ─────────────────────────────────────────────────────
setup_backend() {
  step "1/4" "Setting up Python backend..."

  cd "$BACKEND_DIR"

  # Virtual environment
  if [ ! -d "venv" ]; then
    log "Creating virtual environment..."
    python3 -m venv venv
  fi
  source venv/bin/activate
  log "Activated venv ($(python3 --version))"

  # Install deps (split into core + heavy ML to avoid blocking)
  CORE_DEPS="fastapi uvicorn[standard] sqlalchemy pydantic python-multipart aiofiles numpy pandas httpx python-jose[cryptography] bcrypt jinja2 python-dotenv reportlab openpyxl qrcode[pil] alembic pytest slowapi python-json-logger Pillow scipy scikit-learn"

  # Check if core deps are already installed
  if ! python3 -c "import fastapi, alembic, jose, bcrypt" 2>/dev/null; then
    log "Installing core dependencies..."
    pip install -q $CORE_DEPS 2>&1 | tail -3
  else
    log "Core dependencies already installed"
  fi

  # Try heavy ML deps (optional — torch can be ~2GB)
  if ! python3 -c "import torch" 2>/dev/null; then
    warn "PyTorch not installed — ML endpoints will use simulation mode"
    warn "To install: pip install torch torchvision ultralytics opencv-python-headless"
  fi

  # .env file
  if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
      # Use SQLite for local dev (no Postgres needed)
      log "Creating .env from .env.example (SQLite mode)..."
      cat > .env << 'ENVEOF'
# RetroGuard backend — local SQLite config
# (Leave DATABASE_URL unset for SQLite fallback)
SEED_DEMO=1
JWT_SECRET=hackathon-demo-secret-change-in-prod
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3005
ENVEOF
    fi
  fi
  log ".env configured"

  # Uploads directory
  mkdir -p uploads
  log "Uploads directory ready"

  deactivate 2>/dev/null || true
}

# ─────────────────────────────────────────────────────
#  Setup: Node.js frontend
# ─────────────────────────────────────────────────────
setup_frontend() {
  step "2/4" "Setting up Next.js frontend..."

  cd "$FRONTEND_DIR"

  if [ ! -d "node_modules" ]; then
    log "Installing npm dependencies..."
    npm install --silent 2>&1 | tail -3
  else
    log "node_modules already present"
  fi

  if [ ! -f ".env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    log "Created .env.local"
  else
    log ".env.local exists"
  fi
}

# ─────────────────────────────────────────────────────
#  Start backend
# ─────────────────────────────────────────────────────
start_backend() {
  step "3/4" "Starting FastAPI backend (port 8000)..."

  cd "$BACKEND_DIR"
  source venv/bin/activate

  # Kill existing backend if running
  if [ -f "$PID_DIR/backend.pid" ]; then
    OLD_PID=$(cat "$PID_DIR/backend.pid")
    kill $OLD_PID 2>/dev/null && log "Stopped old backend (PID $OLD_PID)" || true
    rm -f "$PID_DIR/backend.pid"
  fi
  # Also kill anything already on port 8000
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true

  # Start backend (alembic migrations + seed run automatically on startup)
  python3 main.py &
  BACKEND_PID=$!
  echo $BACKEND_PID > "$PID_DIR/backend.pid"

  # Wait for backend to be ready
  for i in $(seq 1 30); do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
      log "Backend ready (PID $BACKEND_PID)"
      log "API docs:   ${CYAN}http://localhost:8000/docs${RESET}"
      log "Health:     ${CYAN}http://localhost:8000/health${RESET}"
      return 0
    fi
    sleep 1
  done

  err "Backend failed to start within 30s"
  cat "$BACKEND_DIR/retroguard.log" 2>/dev/null | tail -10
  return 1
}

# ─────────────────────────────────────────────────────
#  Start frontend
# ─────────────────────────────────────────────────────
start_frontend() {
  step "4/4" "Starting Next.js frontend (port 3000)..."

  cd "$FRONTEND_DIR"

  # Kill existing frontend if running
  if [ -f "$PID_DIR/frontend.pid" ]; then
    OLD_PID=$(cat "$PID_DIR/frontend.pid")
    kill $OLD_PID 2>/dev/null && log "Stopped old frontend (PID $OLD_PID)" || true
    rm -f "$PID_DIR/frontend.pid"
  fi
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true

  npm run dev &
  FRONTEND_PID=$!
  echo $FRONTEND_PID > "$PID_DIR/frontend.pid"

  # Wait for frontend
  for i in $(seq 1 20); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      log "Frontend ready (PID $FRONTEND_PID)"
      log "Dashboard:  ${CYAN}http://localhost:3000${RESET}"
      return 0
    fi
    sleep 1
  done

  err "Frontend failed to start within 20s"
  return 1
}

# ─────────────────────────────────────────────────────
#  Stop all
# ─────────────────────────────────────────────────────
stop_all() {
  step "—" "Stopping RetroGuard..."

  if [ -f "$PID_DIR/backend.pid" ]; then
    kill $(cat "$PID_DIR/backend.pid") 2>/dev/null && log "Backend stopped" || warn "Backend was not running"
    rm -f "$PID_DIR/backend.pid"
  fi
  if [ -f "$PID_DIR/frontend.pid" ]; then
    kill $(cat "$PID_DIR/frontend.pid") 2>/dev/null && log "Frontend stopped" || warn "Frontend was not running"
    rm -f "$PID_DIR/frontend.pid"
  fi

  # Clean up any orphaned processes on these ports
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true

  log "All services stopped"
}

# ─────────────────────────────────────────────────────
#  Reset DB
# ─────────────────────────────────────────────────────
reset_db() {
  step "—" "Resetting database..."

  cd "$BACKEND_DIR"

  # Remove SQLite file
  rm -f retroguard.db retroguard.db-journal
  log "Deleted old database"

  # Remove alembic version tracking (so migrations re-run from scratch)
  rm -rf alembic/versions/__pycache__
  log "Cleared migration cache"

  log "Database will be recreated on next backend start"
  log "Run ${BOLD}./start.sh${RESET} to start fresh"
}

# ─────────────────────────────────────────────────────
#  Status check
# ─────────────────────────────────────────────────────
check_status() {
  step "—" "RetroGuard service status"

  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    STATS=$(curl -s http://localhost:8000/api/dashboard/stats 2>/dev/null)
    ASSETS=$(echo "$STATS" | python3 -c "import json,sys;print(json.load(sys.stdin).get('total_assets','?'))" 2>/dev/null || echo "?")
    ALERTS=$(echo "$STATS" | python3 -c "import json,sys;print(json.load(sys.stdin).get('alerts_active','?'))" 2>/dev/null || echo "?")
    log "Backend:  ${GREEN}RUNNING${RESET} · $ASSETS assets · $ALERTS active alerts"
  else
    err "Backend:  ${RED}NOT RUNNING${RESET}"
  fi

  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log "Frontend: ${GREEN}RUNNING${RESET}"
  else
    err "Frontend: ${RED}NOT RUNNING${RESET}"
  fi
}

# ─────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────
banner

case "${1:-all}" in
  all)
    setup_backend
    setup_frontend
    start_backend
    start_frontend

    echo ""
    echo -e "${BOLD}══════════════════════════════════════════════════${RESET}"
    echo -e "${GREEN}${BOLD}  RetroGuard is running!${RESET}"
    echo ""
    echo -e "  ${BOLD}Dashboard:${RESET}  http://localhost:3000"
    echo -e "  ${BOLD}API Docs:${RESET}   http://localhost:8000/docs"
    echo -e "  ${BOLD}Login:${RESET}      admin / admin"
    echo ""
    echo -e "  ${YELLOW}Press Ctrl+C to stop all services${RESET}"
    echo -e "${BOLD}══════════════════════════════════════════════════${RESET}"
    echo ""

    # Wait and cleanup on exit
    trap "stop_all" EXIT INT TERM
    wait
    ;;

  backend)
    setup_backend
    start_backend
    trap "stop_all" EXIT INT TERM
    wait
    ;;

  frontend)
    setup_frontend
    start_frontend
    trap "stop_all" EXIT INT TERM
    wait
    ;;

  reset)
    stop_all
    reset_db
    ;;

  stop)
    stop_all
    ;;

  status)
    check_status
    ;;

  *)
    echo "Usage: ./start.sh [all|backend|frontend|reset|stop|status]"
    echo ""
    echo "  all       Setup + start backend & frontend (default)"
    echo "  backend   Start backend only (port 8000)"
    echo "  frontend  Start frontend only (port 3000)"
    echo "  reset     Wipe database + stop servers (clean slate)"
    echo "  stop      Stop all running servers"
    echo "  status    Check if servers are running"
    echo ""
    echo "Default login: admin / admin"
    ;;
esac
