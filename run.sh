#!/bin/bash
# RetroGuard - Master Run Script
# 6th NHAI Innovation Hackathon 2026

set -e

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "========================================"
echo "  RetroGuard - AI-Powered Retroreflectivity"
echo "  6th NHAI Innovation Hackathon 2026"
echo "========================================"

case "${1:-all}" in
  backend)
    echo ""
    echo "[1/1] Starting Backend API..."
    cd "$PROJ_DIR/backend"
    if [ ! -d "venv" ]; then
      echo "  Creating virtual environment..."
      python3 -m venv venv
      source venv/bin/activate
      pip install -q fastapi uvicorn sqlalchemy pydantic python-multipart aiofiles numpy pandas
    else
      source venv/bin/activate
    fi
    echo "  Backend running at http://localhost:8000"
    echo "  API docs at http://localhost:8000/docs"
    python3 main.py
    ;;

  frontend)
    echo ""
    echo "[1/1] Starting Frontend Dashboard..."
    cd "$PROJ_DIR/frontend"
    if [ ! -d "node_modules" ]; then
      echo "  Installing dependencies..."
      npm install
    fi
    echo "  Dashboard running at http://localhost:3000"
    npm run dev
    ;;

  ml)
    echo ""
    echo "[1/1] Running ML Demo Pipeline..."
    cd "$PROJ_DIR/ml"
    echo "  Generating demo visualizations..."
    python3 scripts/generate_demo.py
    echo ""
    echo "  Running sign detection (simulation)..."
    python3 scripts/detect_signs.py --simulate
    echo ""
    echo "  Running RL estimation (simulation)..."
    python3 scripts/estimate_rl.py --simulate
    echo ""
    echo "  Running CCTV analysis (simulation)..."
    python3 scripts/process_cctv.py --simulate
    echo ""
    echo "  Running degradation prediction (simulation)..."
    python3 scripts/predict_degradation.py --simulate
    echo ""
    echo "  All outputs saved to: $PROJ_DIR/ml/output/"
    ;;

  all)
    echo ""
    echo "Starting all services..."
    echo ""

    # Start backend in background
    echo "[1/3] Starting Backend API (port 8000)..."
    cd "$PROJ_DIR/backend"
    if [ ! -d "venv" ]; then
      python3 -m venv venv
      source venv/bin/activate
      pip install -q fastapi uvicorn sqlalchemy pydantic python-multipart aiofiles numpy pandas
    else
      source venv/bin/activate
    fi
    python3 main.py &
    BACKEND_PID=$!
    sleep 3

    # Start frontend in background
    echo "[2/3] Starting Frontend Dashboard (port 3000)..."
    cd "$PROJ_DIR/frontend"
    if [ ! -d "node_modules" ]; then
      npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    sleep 3

    echo ""
    echo "========================================"
    echo "  RetroGuard is running!"
    echo "  Backend API:  http://localhost:8000"
    echo "  API Docs:     http://localhost:8000/docs"
    echo "  Dashboard:    http://localhost:3000"
    echo "========================================"
    echo ""
    echo "Press Ctrl+C to stop all services"

    # Wait and cleanup on exit
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Services stopped.'" EXIT
    wait
    ;;

  *)
    echo "Usage: ./run.sh [backend|frontend|ml|all]"
    echo ""
    echo "  backend   - Start FastAPI backend (port 8000)"
    echo "  frontend  - Start Next.js dashboard (port 3000)"
    echo "  ml        - Run ML demo pipeline"
    echo "  all       - Start backend + frontend together"
    ;;
esac
