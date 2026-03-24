# Python Backend Migration Guide

## Overview

This project has been migrated from a Motoko (Internet Computer) backend to a Python-based backend using FastAPI. All functionality has been preserved and adapted for a traditional REST API architecture.

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip or poetry package manager
- Virtual environment (venv, virtualenv, or poetry)

### Quick Start

#### On Linux/macOS:
```bash
# Make the startup script executable
chmod +x start-backend.sh

# Run the startup script
./start-backend.sh
```

#### On Windows:
```bash
# Run the startup script
start-backend.bat
```

### Manual Setup

1. **Create and activate virtual environment:**
   ```bash
   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   
   # Windows
   python -m venv venv
   venv\Scripts\activate.bat
   ```

2. **Install dependencies:**
   ```bash
   pip install -r src/backend/requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp src/backend/.env.example src/backend/.env
   # Edit .env with your configuration
   ```

4. **Initialize the database:**
   ```bash
   python src/backend/init_db.py
   ```

5. **Start the server:**
   ```bash
   python -m uvicorn src.backend.app:app --host 0.0.0.0 --port 8000 --reload
   ```

The backend will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Interactive API Docs (Swagger UI):** http://localhost:8000/docs
- **Alternative API Docs (ReDoc):** http://localhost:8000/redoc

## Architecture

### Core Components

- **app.py**: Main FastAPI application with all API endpoints
- **models.py**: SQLAlchemy database models
- **schemas.py**: Pydantic request/response schemas
- **auth.py**: Authentication, JWT token handling, and security utilities
- **database.py**: Database connection and session management
- **init_db.py**: Database initialization script

### Database

By default, the application uses SQLite for development. For production, configure PostgreSQL:

```bash
# In .env
DATABASE_URL=postgresql://user:password@localhost/productivity_db
```

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login and get access token
- `GET /api/me` - Get current user info

### User Profile
- `GET /api/user-profile` - Get user profile
- `POST /api/user-profile` - Save user profile

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List all tasks
- `PUT /api/tasks/{task_id}` - Update task
- `DELETE /api/tasks/{task_id}` - Delete task

### Schedule
- `POST /api/schedule-items` - Add schedule item
- `GET /api/schedule-template` - Get schedule template

### Reminders
- `POST /api/reminders` - Create reminder
- `GET /api/reminders` - List reminders

### Targets
- `POST /api/targets` - Set target
- `GET /api/targets` - Get target

### Settings
- `POST /api/settings` - Save settings
- `GET /api/settings` - Get settings

### Assistant
- `POST /api/track-action` - Track user action
- `GET /api/assistant-messages` - Get assistant messages

### Data Export
- `GET /api/export-user-data` - Export all user data

## Authentication

The API uses JWT (JSON Web Token) for authentication. 

1. First, register or login to get an access token
2. Include the token in subsequent requests using the `Authorization` header:
   ```
   Authorization: Bearer <your_access_token>
   ```

## Development

### Running with Auto-Reload
```bash
python -m uvicorn src.backend.app:app --reload
```

### Running Tests
```bash
pytest  # Install pytest: pip install pytest
```

### Database Migrations
For production, consider using Alembic for migrations:
```bash
pip install alembic
alembic init alembic
```

## Deployment

### Using Gunicorn (Production)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 src.backend.app:app
```

### Using Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "src.backend.app:app", "--host", "0.0.0.0"]
```

## Environment Variables

Key variables in `.env`:

- `SECRET_KEY` - JWT signing key (change for production!)
- `CAFFEINE_ADMIN_TOKEN` - Admin token for initialization
- `DATABASE_URL` - Database connection string
- `API_HOST` - Server host (default: 0.0.0.0)
- `API_PORT` - Server port (default: 8000)
- `DEBUG` - Debug mode (True/False)

## Troubleshooting

### Import Errors
Make sure you're in the virtual environment:
```bash
# Activate venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate.bat  # Windows
```

### Database Errors
Reset the database:
```bash
rm test.db  # or the database file you're using
python src/backend/init_db.py
```

### Port Already in Use
Use a different port:
```bash
python -m uvicorn src.backend.app:app --port 8001
```

## Migration Notes

### What Changed
- **Authentication**: Moved from Internet Computer Principal-based auth to JWT tokens
- **Data Storage**: From persistent memory to SQL database
- **API Style**: From Motoko function calls to RESTful endpoints
- **Deployment**: From Internet Computer canister to standard Python application

### Compatibility
The frontend may require updates to work with the new Python backend API. The response formats are similar but not identical to the Motoko implementation.

## Next Steps

1. Update your frontend code to use the new Python backend API
2. Configure environment variables for your deployment
3. Test all API endpoints with the provided documentation
4. Consider adding unit tests and integration tests
5. Set up CI/CD pipeline for automated deployment

For more information, refer to:
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Python/JOSE JWT Documentation](https://python-jose.readthedocs.io/)
