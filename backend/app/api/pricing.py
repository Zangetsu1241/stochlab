from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Dict
from backend.app.solvers.black_scholes import calculate_black_scholes

router = APIRouter()

class PricingInput(BaseModel):
    S: float = Field(..., gt=0, description="Spot Price")
    K: float = Field(..., gt=0, description="Strike Price")
    T: float = Field(..., description="Time to Maturity (years)")
    r: float = Field(..., description="Risk-free Interest Rate (decimal)")
    sigma: float = Field(..., gt=0, description="Volatility (decimal)")
    q: float = Field(0.0, ge=0, description="Dividend Yield (decimal)")
    option_type: Literal["call", "put"] = Field("call", description="Option Type")

class PricingResponse(BaseModel):
    price: float
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float

@router.post("/black-scholes", response_model=PricingResponse)
async def price_option(params: PricingInput):
    """
    Calculate Option Price and Greeks using Black-Scholes model.
    """
    try:
        result = calculate_black_scholes(
            S=params.S,
            K=params.K,
            T=params.T,
            r=params.r,
            sigma=params.sigma,
            q=params.q,
            option_type=params.option_type
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
