import numpy as np
from typing import Dict, List, Union

def simulate_gbm(
    *,
    S0: float,
    mu: float,
    sigma: float,
    T: float,
    dt: float,
    n_paths: int = 1
) -> Dict[str, Union[List[float], List[List[float]]]]:
    """
    Simulate Geometric Brownian Motion (GBM) paths.
    
    Model: dS_t = mu * S_t * dt + sigma * S_t * dW_t
    Exact Solution: S(t) = S0 * exp((mu - 0.5 * sigma^2) * t + sigma * W(t))
    
    Parameters
    ----------
    S0 : float
        Initial stock price.
    mu : float
        Drift coefficient (annualized return).
    sigma : float
        Volatility (annualized standard deviation).
    T : float
        Time horizon in years.
    dt : float
        Time step size.
    n_paths : int
        Number of Monte Carlo paths to simulate.
        
    Returns
    -------
    dict
        {
            "time": List[float],    # Time points [0, dt, ..., T]
            "paths": List[List[float]] # List of paths, where each path is a list of prices
        }
    """
    
    # Validation
    if S0 <= 0:
        raise ValueError("Initial price S0 must be positive.")
    if T <= 0:
        raise ValueError("Time horizon T must be positive.")
    if dt <= 0:
        raise ValueError("Time step dt must be positive.")
    if sigma < 0:
        raise ValueError("Volatility sigma cannot be negative.")
        
    # Time steps
    N = int(T / dt)
    t = np.linspace(0, T, N + 1)
    
    # Vectorized Simulation
    # Generate random increment matrix (Paths x Steps)
    # dW ~ N(0, dt) -> sqrt(dt) * N(0, 1)
    dW = np.random.normal(0, np.sqrt(dt), size=(n_paths, N))
    
    # Cumulative sum for Brownian path W(t)
    # Insert 0 at the beginning for t=0
    W = np.cumsum(dW, axis=1)
    W = np.hstack([np.zeros((n_paths, 1)), W])
    
    # Calculate exact solution for all paths at once
    # S(t) = S0 * exp((mu - 0.5 * sigma^2) * t + sigma * W(t))
    # Reshape t to broadcast: (1, Steps)
    drift_term = (mu - 0.5 * sigma**2) * t.reshape(1, -1)
    diffusion_term = sigma * W
    
    S = S0 * np.exp(drift_term + diffusion_term)
    
    # Rounding for JSON size optimization (optional but good for API)
    S = np.round(S, 4)
    
    return {
        "time": t.tolist(),
        "paths": S.tolist()
    }
