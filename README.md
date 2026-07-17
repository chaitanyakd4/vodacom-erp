# Vodacom ERP

Enterprise Resource Planning system for Vodacom - Billing, Inventory, AMC & Customer Management.

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or SQLite for development)

### Quick Start (Windows)
```bash
setup.bat
```

### Manual Setup

#### Backend
```bash
cd backend
copy .env.example .env
# Edit .env with your database URL and secrets
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- 🔐 JWT Authentication
- 👥 Customer Management (CRUD + Search)
- 📦 Product/Inventory Management (+ Excel Import)
- 🧾 GST-Compliant Invoice Generation (PDF)
- 📋 AMC Contract Tracking with Expiry Alerts
- 📊 Dashboard with Business Analytics
