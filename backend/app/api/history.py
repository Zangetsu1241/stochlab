from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app import models, schemas, database
from backend.app.api.auth import get_current_user

router = APIRouter()

@router.get("/{sim_type}", response_model=List[schemas.HistoryResponse])
def get_history(
    sim_type: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Fetch last 10 entries for this user & sim_type
    history = (
        db.query(models.SimulationHistory)
        .filter(models.SimulationHistory.user_id == current_user.id)
        .filter(models.SimulationHistory.simulation_type == sim_type)
        .order_by(desc(models.SimulationHistory.timestamp))
        .limit(10)
        .all()
    )
    return history

@router.post("/", response_model=schemas.HistoryResponse)
def create_history(
    item: schemas.HistoryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check current count to enforce limit of 10
    count = (
        db.query(models.SimulationHistory)
        .filter(models.SimulationHistory.user_id == current_user.id)
        .filter(models.SimulationHistory.simulation_type == item.simulation_type)
        .count()
    )

    if count >= 10:
        # Delete oldest
        oldest = (
            db.query(models.SimulationHistory)
            .filter(models.SimulationHistory.user_id == current_user.id)
            .filter(models.SimulationHistory.simulation_type == item.simulation_type)
            .order_by(models.SimulationHistory.timestamp.asc())
            .first()
        )
        if oldest:
            db.delete(oldest)

    new_history = models.SimulationHistory(
        user_id=current_user.id,
        simulation_type=item.simulation_type,
        parameters=item.parameters
    )
    db.add(new_history)
    db.commit()
    db.refresh(new_history)
    return new_history
