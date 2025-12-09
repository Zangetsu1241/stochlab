from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.app.solvers.monte_carlo import run_parameter_sweep

router = APIRouter()

class RangeInput(BaseModel):
    min: float
    max: float

class UQInput(BaseModel):
    model_type: str = Field(..., description="'gbm' or 'pricing'")
    n_sims: int = Field(1000, ge=100, le=10000)
    base_params: Dict[str, Any]
    param_ranges: Dict[str, RangeInput] = {} # Optional ranges

class UQResponse(BaseModel):
    stats: Dict[str, float]
    histogram: Dict[str, List[float]]
    timing: float

@router.post("/simulate", response_model=UQResponse)
async def simulate_uq(input_data: UQInput):
    """
    Run Monte Carlo Uncertainty Quantification.
    """
    try:
        # Convert Pydantic ranges to simple list for internal function
        ranges_dict = {
            k: [v.min, v.max] for k, v in input_data.param_ranges.items()
        }
        
        result = run_parameter_sweep(
            model_type=input_data.model_type,
            base_params=input_data.base_params,
            param_ranges=ranges_dict,
            n_sims=input_data.n_sims
        )
        
        return {
            "stats": result["stats"],
            "histogram": result["histogram"],
            "timing": result["timing"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UQ failed: {str(e)}")
