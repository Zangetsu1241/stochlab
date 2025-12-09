from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, List, Dict
from backend.app.solvers.hedging import simulate_delta_hedging

router = APIRouter()

class HedgingInput(BaseModel):
    S0: float = Field(..., gt=0, description="Initial Spot Price")
    K: float = Field(..., gt=0, description="Strike Price")
    T: float = Field(..., gt=0, description="Time to Maturity (years)")
    r: float = Field(..., description="Risk-free Interest Rate (decimal)")
    sigma: float = Field(..., gt=0, description="Volatility (decimal)")
    mu: float = Field(..., description="Drift (decimal)")
    option_type: Literal["call", "put"] = Field("call", description="Option Type")
    rebalance_freq: str = Field("daily", description="Rebalancing Frequency (daily/weekly)")

class HedgingResponse(BaseModel):
    time: List[float]
    stock_price: List[float]
    option_price: List[float]
    delta: List[float]
    pnl: List[float]

@router.post("/simulate", response_model=HedgingResponse)
async def simulate_hedging_endpoint(params: HedgingInput):
    """
    Simulate Delta Hedging Strategy P&L.
    """
    try:
        result = simulate_delta_hedging(
            S0=params.S0,
            K=params.K,
            T=params.T,
            r=params.r,
            sigma=params.sigma,
            mu=params.mu,
            option_type=params.option_type,
            rebalance_freq=params.rebalance_freq
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
