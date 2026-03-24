from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

def to_camel(string: str) -> str:
    return "".join(word.capitalize() if i > 0 else word for i, word in enumerate(string.split("_")))

class ConfigBase:
    alias_generator = to_camel
    populate_by_name = True  # Pydantic V2
    allow_population_by_field_name = True  # Pydantic V1
    from_attributes = True
    orm_mode = True  # Pydantic V1

class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    guest = "guest"

# Task Schemas
class TaskCreate(BaseModel):
    title: str
    description: str

    class Config(ConfigBase):
        pass

class TaskUpdate(BaseModel):
    title: str
    description: str
    is_complete: bool

    class Config(ConfigBase):
        pass

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    is_complete: bool
    created_at: datetime
    
    class Config(ConfigBase):
        pass

# Schedule Item Schemas
class ScheduleItemCreate(BaseModel):
    title: str
    duration: int

    class Config(ConfigBase):
        pass

class ScheduleItemResponse(BaseModel):
    id: int
    title: str
    duration: int
    
    class Config(ConfigBase):
        pass

# Reminder Schemas
class ReminderCreate(BaseModel):
    title: str
    date_time: datetime
    is_birthday: bool

    class Config(ConfigBase):
        pass

class ReminderResponse(BaseModel):
    id: int
    title: str
    date_time: datetime
    is_birthday: bool
    is_triggered: bool
    
    class Config(ConfigBase):
        pass

# Target Schemas
class TargetCreate(BaseModel):
    title: str
    current_value: int = Field(..., alias="currentValue")
    goal_value: int = Field(..., alias="goalValue")

    class Config(ConfigBase):
        pass

class TargetResponse(BaseModel):
    id: int
    title: str
    current_value: int = Field(..., alias="currentValue")
    goal_value: int = Field(..., alias="goalValue")
    
    class Config(ConfigBase):
        pass

# Settings Schemas
class UserSettingsCreate(BaseModel):
    background_type: str
    background_value: str

    class Config(ConfigBase):
        pass

class UserSettingsResponse(BaseModel):
    id: int
    background_type: str
    background_value: str
    
    class Config(ConfigBase):
        pass

# User Profile Schemas
class UserProfileCreate(BaseModel):
    username: str
    email: str

    class Config(ConfigBase):
        pass

class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    
    class Config(ConfigBase):
        pass

# Assistant Message Schemas
class AssistantMessageResponse(BaseModel):
    id: int
    role: str
    text: str
    created_at: datetime
    
    class Config(ConfigBase):
        pass

# Data Export Schema
class UserDataExport(BaseModel):
    tasks: List[TaskResponse]
    schedule_template: List[ScheduleItemResponse]
    reminders: List[ReminderResponse]
    targets: List[TargetResponse]
    settings: Optional[UserSettingsResponse]
    
    class Config:
        from_attributes = True
