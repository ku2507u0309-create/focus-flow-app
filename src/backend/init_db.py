#!/usr/bin/env python3
"""
Initialization script for the Python backend.
Run this to set up the database and create the first admin user.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import Base, User
from auth import hash_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")

def create_admin_user(username: str = "admin", email: str = "admin@example.com", password: str = "admin123"):
    """Create initial admin user"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Check if admin already exists
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        print(f"✗ Admin user already exists: {existing_admin.username}")
        return
    
    # Create admin user
    admin = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    print(f"✓ Admin user created: {username} ({email})")
    print(f"  Store your credentials safely!")
    db.close()

if __name__ == "__main__":
    print("Initializing Python Backend Database...")
    init_db()
    create_admin_user()
    print("\n✓ Backend setup complete!")
