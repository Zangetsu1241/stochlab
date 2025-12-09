from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

# --- History Schemas ---
class HistoryBase(BaseModel):
    simulation_type: str
    parameters: str # JSON string

class HistoryCreate(HistoryBase):
    pass

class HistoryResponse(HistoryBase):
    id: int
    timestamp: datetime
    class Config:
        orm_mode = True
