from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from backend.app.solvers.reaction_diffusion import solve_reaction_diffusion

router = APIRouter()

class ReactionInput(BaseModel):
    Du: float = Field(0.16, description="Diffusion rate of U", ge=0.001, le=1.0)
    Dv: float = Field(0.08, description="Diffusion rate of V", ge=0.001, le=1.0)
    F: float = Field(0.035, description="Feed rate", ge=0.0, le=0.5)
    k: float = Field(0.060, description="Kill rate", ge=0.0, le=0.5)
    sigma: float = Field(0.0, description="Noise intensity", ge=0.0, le=2.0)
    T: float = Field(100.0, description="Total simulation time", gt=0.0, le=2000.0)
    dt: float = Field(1.0, description="Time step", gt=0.0) # Larger dt for reaction-diffusion (if stable) or smaller
    dx: float = Field(1.0, description="Spatial step", gt=0.0)
    init_type: str = Field("random_center", description="Initial condition")
    width: int = Field(64, description="Grid width", ge=10, le=256)
    height: int = Field(64, description="Grid height", ge=10, le=256)
    current_u: List[List[float]] = Field(None, description="Previous U state")
    current_v: List[List[float]] = Field(None, description="Previous V state")

class ReactionResponse(BaseModel):
    t: List[float]
    U: List[List[List[float]]] # [time][x][y]
    V: List[List[List[float]]] # [time][x][y]
    parameters: Dict[str, float]

@router.post("/simulate", response_model=ReactionResponse)
def simulate_reaction(input_data: ReactionInput):
    """
    Simulate the 2D Stochastic Reaction-Diffusion System (Gray-Scott).
    Returns the time evolution of the U component (concentration).
    """
    try:
        result = solve_reaction_diffusion(
            Du=input_data.Du,
            Dv=input_data.Dv,
            F=input_data.F,
            k=input_data.k,
            sigma=input_data.sigma,
            T=input_data.T,
            dt=input_data.dt,
            dx=input_data.dx,
            init_type=input_data.init_type,
            width=input_data.width,
            height=input_data.height,
            current_u=input_data.current_u,
            current_v=input_data.current_v
        )
        
        # Filter response to reduce size? 
        # The solver already decimates frames.
        # Remove "V" from result to save bandwidth if frontend only shows U.
        # But for full research vis, user might want V.
        # Let's keep U only in pydantic model for now to start light, 
        # as U+V for 50 frames of 64x64 is: 50 * 64 * 64 * 8 bytes * 2 ~ 3MB. Acceptable.
        # The pydantic model above doesn't have V, so `result` having V won't validate or will strip it.
        # Default behavior: Pydantic < 2.0 strips extras.
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
