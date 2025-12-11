from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from backend.app.solvers.wave_fd import solve_wave_equation

router = APIRouter()

class WaveInput(BaseModel):
    c: float = Field(1.0, description="Wave speed", ge=0.1, le=10.0)
    damping: float = Field(0.0, description="Damping coefficient", ge=0.0, le=5.0)
    sigma: float = Field(0.0, description="Noise intensity", ge=0.0, le=20.0)
    T: float = Field(5.0, description="Total simulation time", gt=0.0, le=50.0)
    dt: float = Field(0.05, description="Time step", gt=0.0)
    dx: float = Field(0.1, description="Spatial step", gt=0.0)
    domain_len: float = Field(10.0, description="Length of the domain", gt=0.0)
    init_type: str = Field("pulse", description="Initial condition: 'pulse' or 'string'")
    current_u: List[float] = Field(None, description="Current state (u) for resuming")
    current_u_prev: List[float] = Field(None, description="Previous state (u_prev) for resuming")

class WaveResponse(BaseModel):
    x: List[float]
    t: List[float]
    frames: List[List[float]]
    energy: List[float]

@router.post("/simulate", response_model=WaveResponse)
def simulate_wave(input_data: WaveInput):
    """
    Simulate the 1D Stochastic Wave Equation.
    """
    try:
        result = solve_wave_equation(
            c=input_data.c,
            damping=input_data.damping,
            sigma=input_data.sigma,
            T=input_data.T,
            dt=input_data.dt,
            dx=input_data.dx,
            domain_len=input_data.domain_len,
            init_type=input_data.init_type,
            current_u=input_data.current_u,
            current_u_prev=input_data.current_u_prev
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
