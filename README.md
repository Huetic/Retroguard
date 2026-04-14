# RetroGuard: AI-Powered Retroreflectivity Assessment for Indian National Highways

**6th NHAI Innovation Hackathon 2026**

## Overview

RetroGuard is a multi-layered AI-powered system for automated retroreflectivity assessment on Indian national highways. It replaces dangerous, slow, and expensive handheld measurement with six synergistic technology layers.

## Architecture

```
Layer 1: Smartphone Retroreflectometer (zero hardware cost)
Layer 2: Existing CCTV Footage Mining (zero infrastructure cost)
Layer 3: Retroreflective Reference Patches (universal calibration)
Layer 4: Crowdsourced Dashcam Intelligence Network
Layer 5: Predictive Digital Twin with ML Degradation Forecasting
Layer 6: Degradation-Encoding QR Codes on Signs
```

## Project Structure

```
NHAI/
├── backend/          # FastAPI backend + ML inference
├── frontend/         # Next.js dashboard
├── ml/              # ML training & inference scripts
├── scripts/         # Utility scripts
└── latex/           # Research paper
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### ML Pipeline
```bash
cd ml
python scripts/detect_signs.py --input <image_or_video>
python scripts/estimate_rl.py --input <image>
python scripts/process_cctv.py --input <video>
```

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Frontend:** Next.js 14, Tailwind CSS, Leaflet, Recharts
- **ML:** YOLOv8, PyTorch, ResNet-50, LSTM
- **Mobile:** Progressive Web App (PWA)

## Team

- **Madhav Dogra** - madhavdogra@gmail.com
