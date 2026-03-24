@echo off
REM Script to start the Python backend server on Windows

cd /d "%~dp0"

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r src\backend\requirements.txt

REM Initialize database
echo Initializing database...
python src\backend\init_db.py

REM Start the backend server
echo Starting backend server...
python -m uvicorn src.backend.app:app --host 0.0.0.0 --port 8000 --reload
