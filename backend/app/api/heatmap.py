from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from backend.app.solvers.heat_fd import solve_heat

router = APIRouter()

class HeatInput(BaseModel):
    alpha: float = Field(..., gt=0, description="Diffusivity coefficient")
    dt: float = Field(..., gt=0, description="Time step")
    dx: float = Field(..., gt=0, description="Spatial grid spacing")
    t_steps: int = Field(..., gt=0, description="Number of time steps")
    domain: float = Field(1.0, gt=0, description="Length of spatial domain")
    init: Literal["pulse", "sin", "random"] = "pulse"
    current_state: Optional[List[float]] = Field(None, description="Custom initial state for resuming simulation")
    sigma: float = Field(0.0, ge=0.0, description="Noise strength")
    snapshot_interval: int = Field(1, ge=1, description="Save every Nth frame")

class HeatResponse(BaseModel):
    frames: List[List[float]]
    energy: List[float]

@router.post("/solve", response_model=HeatResponse)
def solve_heat_equation(params: HeatInput):
    try:
        result = solve_heat(
            alpha=params.alpha,
            dt=params.dt,
            dx=params.dx,
            t_steps=params.t_steps,
            domain=params.domain,
            init=params.init,
            init_state=params.current_state,
            sigma=params.sigma,
            snapshot_interval=params.snapshot_interval,
            return_as_list=True
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
