from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import os
from dotenv import load_dotenv
from pydantic import BaseModel
import requests
import sys
sys.path.append(os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import User, Task, ScheduleItem, Reminder, Target, UserSettings, UserProfile, AssistantMessage, UserEvent
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    ScheduleItemCreate, ScheduleItemResponse,
    ReminderCreate, ReminderResponse,
    TargetCreate, TargetResponse,
    UserSettingsCreate, UserSettingsResponse,
    UserProfileCreate, UserProfileResponse,
    AssistantMessageResponse,
    UserDataExport
)
from auth import (
    verify_token, get_current_user, 
    hash_password, verify_password, 
    create_access_token
)

load_dotenv()

app = FastAPI(title="Personal Productivity Assistant API")

# ─── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "https://focus-flow-app-frontend.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class AssistantMessageInput(BaseModel):
    role: str
    text: str

class AssistantQueryRequest(BaseModel):
    prompt: str
    type: str = "explorer"  # "explorer" or "mentor"
    context: Optional[dict] = None
    conversationHistory: Optional[List[AssistantMessageInput]] = None

class AssistantQueryResponse(BaseModel):
    response: str

# Create tables
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =========================
# REQUEST/RESPONSE SCHEMAS
# =========================

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# =========================
# AUTHENTICATION ENDPOINTS
# =========================

@app.post("/api/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Check if this is the first user (should become admin)
    first_user = db.query(User).count() == 0
    
    # Create new user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role="admin" if first_user else "user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(days=1)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(days=1)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role
    }

@app.post("/api/initialize-access-control")
def initialize_access_control(secret: str, db: Session = Depends(get_db)):
    """Initialize access control - first caller becomes admin"""
    admin_token = os.getenv("CAFFEINE_ADMIN_TOKEN")
    
    if not admin_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CAFFEINE_ADMIN_TOKEN not configured"
        )
    
    if secret != admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token"
        )
    
    # Check if any admin exists
    admin_exists = db.query(User).filter(User.role == "admin").first()
    if admin_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin already assigned"
        )
    
    return {"message": "Access control initialized. First user to authenticate will become admin."}

@app.get("/api/caller-user-role")
def get_caller_user_role(current_user: User = Depends(get_current_user)):
    """Get current user's role"""
    return {"role": current_user.role}

@app.post("/api/assign-user-role")
def assign_user_role(
    user_id: int,
    role: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign role to user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    db.commit()
    return {"message": "Role assigned"}

@app.get("/api/is-caller-admin")
def is_caller_admin(current_user: User = Depends(get_current_user)):
    """Check if current user is admin"""
    return {"is_admin": current_user.role == "admin"}

# =========================
# USER PROFILE ENDPOINTS
# =========================

@app.get("/api/user-profile", response_model=Optional[UserProfileResponse])
def get_caller_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    return profile

@app.post("/api/user-profile", response_model=UserProfileResponse)
def save_caller_user_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save current user's profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if profile:
        profile.username = profile_data.username
        profile.email = profile_data.email
    else:
        profile = UserProfile(
            user_id=current_user.id,
            username=profile_data.username,
            email=profile_data.email
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    return profile

# =========================
# TASKS ENDPOINTS
# =========================

@app.post("/api/tasks", response_model=TaskResponse)
def add_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new task"""
    task = Task(
        user_id=current_user.id,
        title=task_data.title,
        description=task_data.description,
        is_complete=False,
        created_at=datetime.utcnow()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@app.get("/api/tasks", response_model=List[TaskResponse])
def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks for current user"""
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    return tasks

@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.title = task_data.title
    task.description = task_data.description
    task.is_complete = task_data.is_complete
    db.commit()
    db.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

# =========================
# SCHEDULE ENDPOINTS
# =========================

@app.post("/api/schedule-items", response_model=ScheduleItemResponse)
def add_schedule_item(
    item_data: ScheduleItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add schedule item"""
    item = ScheduleItem(
        user_id=current_user.id,
        title=item_data.title,
        duration=item_data.duration
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/api/schedule-template", response_model=List[ScheduleItemResponse])
def get_schedule_template(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get schedule template"""
    items = db.query(ScheduleItem).filter(ScheduleItem.user_id == current_user.id).all()
    return items

# =========================
# REMINDERS ENDPOINTS
# =========================

@app.post("/api/reminders", response_model=ReminderResponse)
def add_reminder(
    reminder_data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a reminder"""
    reminder = Reminder(
        user_id=current_user.id,
        title=reminder_data.title,
        date_time=reminder_data.date_time,
        is_birthday=reminder_data.is_birthday,
        is_triggered=False
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@app.get("/api/reminders", response_model=List[ReminderResponse])
def get_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reminders"""
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
    return reminders

# =========================
# TARGETS ENDPOINTS
# =========================

@app.post("/api/targets", response_model=TargetResponse)
def add_target(
    target_data: TargetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new target"""
    target = Target(
        user_id=current_user.id,
        title=target_data.title,
        current_value=target_data.current_value,
        goal_value=target_data.goal_value
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    return target

@app.get("/api/targets", response_model=List[TargetResponse])
def get_targets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all targets for current user"""
    targets = db.query(Target).filter(Target.user_id == current_user.id).all()
    return targets

@app.put("/api/targets/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: int,
    target_data: TargetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a target"""
    target = db.query(Target).filter(Target.id == target_id, Target.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    # Update fields if provided
    if target_data.title is not None:
        target.title = target_data.title
    if target_data.current_value is not None:
        target.current_value = target_data.current_value
    if target_data.goal_value is not None:
        target.goal_value = target_data.goal_value
        
    db.commit()
    db.refresh(target)
    return target

@app.delete("/api/targets/{target_id}")
def delete_target(
    target_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a target"""
    target = db.query(Target).filter(Target.id == target_id, Target.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    return {"message": "Target deleted"}

# =========================
# SETTINGS ENDPOINTS
# =========================

@app.post("/api/settings", response_model=UserSettingsResponse)
def set_user_settings(
    settings_data: UserSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save user settings"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if settings:
        settings.background_type = settings_data.background_type
        settings.background_value = settings_data.background_value
    else:
        settings = UserSettings(
            user_id=current_user.id,
            background_type=settings_data.background_type,
            background_value=settings_data.background_value
        )
        db.add(settings)
    
    db.commit()
    db.refresh(settings)
    return settings

@app.get("/api/settings", response_model=Optional[UserSettingsResponse])
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user settings"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    return settings

# =========================
# ASSISTANT ENDPOINTS
# =========================

@app.post("/api/track-action")
def track_user_action(
    kind: str,
    payload: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track user action and generate assistant response"""
    event = UserEvent(
        user_id=current_user.id,
        kind=kind,
        payload=payload,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # Generate response
    response_text = _generate_response_for_event(kind, payload)
    
    message = AssistantMessage(
        user_id=current_user.id,
        role="assistant",
        text=response_text,
        created_at=datetime.utcnow()
    )
    db.add(message)
    db.commit()
    
    return {"response": response_text}

@app.get("/api/assistant-messages", response_model=List[AssistantMessageResponse])
def get_assistant_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all assistant messages"""
    messages = db.query(AssistantMessage).filter(
        AssistantMessage.user_id == current_user.id
    ).order_by(AssistantMessage.created_at).all()
    return messages

@app.post("/api/assistant-messages", response_model=AssistantMessageResponse)
def add_assistant_message(
    message_data: AssistantMessageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new assistant or user message to history"""
    message = AssistantMessage(
        user_id=current_user.id,
        role=message_data.role,
        text=message_data.text,
        created_at=datetime.utcnow()
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

@app.delete("/api/assistant-messages")
def delete_assistant_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all assistant messages for current user to free up memory"""
    db.query(AssistantMessage).filter(AssistantMessage.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared"}

# =========================
# ASSISTANT QUERY ENDPOINT
# =========================

@app.post("/api/assistant-query", response_model=AssistantQueryResponse)
def query_assistant(
    request: AssistantQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Query Groq API for assistant response (backend proxy)"""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    
    # Build specialized system prompts
    is_mentor = request.type == "mentor"
    
    if is_mentor:
        system_prompt = """You are a smart, friendly productivity assistant.

Your role:
- Help users plan their day
- Encourage focus
- Suggest improvements
- Respond conversationally

Rules:
- Never force actions
- Always ask before giving plans
- Keep responses short (1-2 lines preferred)
- Be motivating but not aggressive
- Adapt to user behavior"""
    else:
        system_prompt = """You are a friendly Explorer Assistant. 
Your tone is helpful, fun, and conversational.
Rules:
- Be concise (aim for 1-3 short paragraphs).
- Only provide long, detailed explanations if the user specifically asks for deep-dives.
- Use emojis and be fun, but don't over-explain basic things."""

    context = request.context or {}
    if context:
        if is_mentor:
            if context.get("onboarding_data"):
                data = context["onboarding_data"]
                system_prompt += f"\n\nUSER PROFILE:\n- Goal: {data.get('goal')}\n- Weakness: {data.get('mainWeakness')}\n- Distraction: {data.get('biggestDistraction')}\n- Routine: {data.get('routine')}"
        
        if context.get("username"):
            system_prompt += f"\n\nYou're chatting with {context['username']}."
            
        if not is_mentor:
            if context.get("instruction"):
                system_prompt += f"\n\nGUIDELINE: {context['instruction']}"
        
        if context.get("tasks"):
            tasks = context["tasks"]
            active_tasks = [t for t in tasks if not t.get("isComplete", False)]
            completed = len([t for t in tasks if t.get("isComplete", False)])
            if active_tasks:
                system_prompt += f"\n\nThey're currently working on: {', '.join([t['title'] for t in active_tasks])}"
            if completed > 0:
                system_prompt += f"\n\nThey've completed {completed} task(s) so far. Great progress!"
        
        if context.get("upcomingReminders"):
            reminders = context["upcomingReminders"]
            if reminders:
                system_prompt += f"\n\nUpcoming reminders: {', '.join([r['title'] for r in reminders])}"
    
    # Call Groq API
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    messages = [{"role": "system", "content": system_prompt}]
    history = request.conversationHistory if request.conversationHistory else []
    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.text})
    messages.append({"role": "user", "content": request.prompt})

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        output = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if not output:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unexpected response from Groq API"
            )
            
        # Add the messages to DB for persistence
        user_msg = AssistantMessage(
            user_id=current_user.id,
            role="user",
            text=request.prompt,
            created_at=datetime.utcnow()
        )
        assistant_msg = AssistantMessage(
            user_id=current_user.id,
            role="assistant",
            text=output.strip(),
            created_at=datetime.utcnow()
        )
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()
        
        return AssistantQueryResponse(response=output.strip())
    
    except requests.exceptions.RequestException as e:
        err_msg = str(e)
        global LAST_GROQ_ERROR
        LAST_GROQ_ERROR = err_msg
        print(f"DEBUG: Groq API Error Type: {type(e).__name__}")
        print(f"DEBUG: Groq API Error Message: {err_msg}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"DEBUG: Groq API Response Status: {e.response.status_code}")
            print(f"DEBUG: Groq API Response Body: {e.response.text}")
            LAST_GROQ_ERROR = f"Status {e.response.status_code}: {e.response.text}"
        
        # Fallback response if the API is completely unreachable
        fallback_msg = "I'm having a bit of trouble connecting to my neural network right now, but I'm still here cheering for you!"
        
        # Add the fallback to DB so it doesn't break the flow
        user_msg = AssistantMessage(
            user_id=current_user.id,
            role="user",
            text=request.prompt,
            created_at=datetime.utcnow()
        )
        assistant_msg = AssistantMessage(
            user_id=current_user.id,
            role="assistant",
            text=fallback_msg,
            created_at=datetime.utcnow()
        )
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()
        
        return AssistantQueryResponse(response=fallback_msg)

@app.get("/api/export-user-data", response_model=UserDataExport)
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all user data"""
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    schedule_items = db.query(ScheduleItem).filter(ScheduleItem.user_id == current_user.id).all()
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
    target = db.query(Target).filter(Target.user_id == current_user.id).first()
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    return UserDataExport(
        tasks=tasks,
        schedule_template=schedule_items,
        reminders=reminders,
        target=target,
        settings=settings
    )

# =========================
# HELPER FUNCTIONS
# =========================

def _generate_response_for_event(kind: str, payload: str) -> str:
    """Generate motivational response based on event type"""
    responses = {
        "daily_checkin": "Here's your daily check-in: you're making progress! Pick one meaningful task to focus on next, and keep the streak going. 👍",
        "task_completed": "Nice work. Keep the momentum going.",
        "task_created": "Nice work adding a task. Let me know if you need help with it.",
        "reminder": "Time for your scheduled task. Start now?",
        "daily_log": "Nice! Tracking your daily schedule helps you stay focused. Keep marking progress as you go.",
        "journal": "Thanks for taking a moment to reflect. Writing about your day is a powerful habit – keep it up, and you'll gain clarity quickly!",
        "target": "Nice! Keeping your goals visible helps you stay focused. Check in on your progress soon to keep momentum.",
        "inactivity": "Hey, you've been inactive. Want to continue?",
        "no_tasks": "Want to plan your day?",
        "task_skip": "It's ok to skip things sometimes. Just stay consistent overall."
    }
    
    return responses.get(kind, "Got it! Keep going, you're doing great.")

# Health check endpoint
@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

# Global variable to store last error for debugging
LAST_GROQ_ERROR = None

@app.get("/api/debug-key")
def debug_key():
    """Temporary debug endpoint to verify key presence and see last error"""
    key = os.getenv("GROQ_API_KEY")
    global LAST_GROQ_ERROR
    if not key:
        return {"key_present": False, "mask": None, "last_error": LAST_GROQ_ERROR}
    return {"key_present": True, "mask": f"{key[:5]}...{key[-3:]}", "last_error": LAST_GROQ_ERROR}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

