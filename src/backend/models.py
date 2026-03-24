from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    schedule_items = relationship("ScheduleItem", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    targets = relationship("Target", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="user", cascade="all, delete-orphan")
    events = relationship("UserEvent", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("AssistantMessage", back_populates="user", cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    username = Column(String)
    email = Column(String)
    
    user = relationship("User", back_populates="profile")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String)
    is_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="tasks")

class ScheduleItem(Base):
    __tablename__ = "schedule_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    duration = Column(Integer)  # Duration in minutes
    
    user = relationship("User", back_populates="schedule_items")

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    date_time = Column(DateTime)
    is_birthday = Column(Boolean, default=False)
    is_triggered = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="reminders")

class Target(Base):
    __tablename__ = "targets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    current_value = Column(Integer)
    goal_value = Column(Integer)
    
    user = relationship("User", back_populates="targets")

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    background_type = Column(String)  # "color" or "image"
    background_value = Column(String)
    
    user = relationship("User", back_populates="settings")

class UserEvent(Base):
    __tablename__ = "user_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    kind = Column(String)
    payload = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="events")

class AssistantMessage(Base):
    __tablename__ = "assistant_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)  # "user" or "assistant"
    text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="messages")
