#!/bin/bash
# Script to start the Python backend server

cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r src/backend/requirements.txt

# Initialize database
echo "Initializing database..."
python3 src/backend/init_db.py

# Start the backend server
echo "Starting backend server..."
python3 -m uvicorn src.backend.app:app --host 0.0.0.0 --port 8000 --reload
