from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from backend.app.solvers.gbm import simulate_gbm

router = APIRouter()

class GBMInput(BaseModel):
    S0: float = Field(..., gt=0, description="Initial stock price")
    mu: float = Field(..., description="Drift (annualized return)")
    sigma: float = Field(..., ge=0, description="Volatility (annualized std dev)")
    T: float = Field(..., gt=0, description="Time horizon (years)")
    dt: float = Field(..., gt=0, description="Time step")
    n_paths: int = Field(1, ge=1, le=100, description="Number of Monte Carlo paths")

class GBMResponse(BaseModel):
    time: List[float]
    paths: List[List[float]]

@router.post("/simulate", response_model=GBMResponse)
async def get_gbm_paths(params: GBMInput):
    """
    Simulate Geometric Brownian Motion paths.
    """
    try:
        result = simulate_gbm(
            S0=params.S0,
            mu=params.mu,
            sigma=params.sigma,
            T=params.T,
            dt=params.dt,
            n_paths=params.n_paths
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
