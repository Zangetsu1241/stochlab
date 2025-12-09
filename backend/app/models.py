from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    # Relationships
    history = relationship("SimulationHistory", back_populates="owner")

class SimulationHistory(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    simulation_type = Column(String, index=True) # e.g., 'gbm', 'heat_eq'
    parameters = Column(Text) # JSON string of params
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="history")
