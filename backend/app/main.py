# Force Reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import heatmap, gbm, pricing, hedging, wave, reaction, uq, auth, history
from backend.app import models, database

# Create Tables safely
try:
    models.Base.metadata.create_all(bind=database.engine)
except Exception as e:
    print(f"Warning: Database table creation failed (possibly locked): {e}")

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(history.router, prefix="/api/v1/history", tags=["History"])
app.include_router(heatmap.router, prefix="/api/v1/heat", tags=["Heat Equation"])
app.include_router(gbm.router, prefix="/api/v1/gbm", tags=["GBM"])
app.include_router(pricing.router, prefix="/api/v1/pricing", tags=["Option Pricing"])
app.include_router(hedging.router, prefix="/api/v1/hedging", tags=["Hedging"])
app.include_router(wave.router, prefix="/api/v1/wave", tags=["Wave Equation"])
app.include_router(reaction.router, prefix="/api/v1/reaction", tags=["Reaction-Diffusion"])
app.include_router(uq.router, prefix="/api/v1/uq", tags=["Uncertainty Quantification"])


@app.get("/")
def read_root():
    return {"message": "Welcome to StochLab API"}
