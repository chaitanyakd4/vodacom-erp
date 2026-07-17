@echo off
echo ========================================
echo   Vodacom ERP - One-Click Setup
echo ========================================
echo.

:: Backend Setup
echo [1/5] Setting up Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate

echo [2/5] Installing Python dependencies...
pip install -r requirements.txt

echo [3/5] Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo Created .env file - please update with your settings!
)

echo [4/5] Seeding database...
python seed.py

:: Frontend Setup
echo [5/5] Installing frontend dependencies...
cd ..\frontend
call npm install

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the backend:
echo   cd backend ^&^& venv\Scripts\activate ^&^& uvicorn app.main:app --reload
echo.
echo To start the frontend:
echo   cd frontend ^&^& npm run dev
echo.
pause
