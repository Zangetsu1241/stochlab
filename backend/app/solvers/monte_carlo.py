import numpy as np
import time
from typing import Callable, Dict, List, Any, Union
from backend.app.solvers.gbm import simulate_gbm
from backend.app.solvers.black_scholes import calculate_black_scholes

def run_parameter_sweep(
    model_type: str,
    base_params: Dict[str, Any],
    param_ranges: Dict[str, List[float]],
    n_sims: int = 1000
) -> Dict[str, Any]:
    """
    Runs a Monte Carlo parameter sweep or simply many simulations to generate a distribution.
    
    Args:
        model_type: "gbm" or "pricing"
        base_params: Fixed parameters for the model
        param_ranges: Dictionary where keys are param names and values are [min, max]. 
                      If empty, just runs N simulations with fixed params (for stochastic models).
        n_sims: Number of iterations.
        
    Returns:
        Dict with "results" (list of outcomes) and "timing".
    """
    
    results = []
    start_time = time.time()
    
    # Validation
    if n_sims > 10000:
        raise ValueError("Max 10,000 simulations allowed for synchronous sweep.")
    
    # 1. GBM Final Price Distribution
    if model_type == "gbm":
        # For GBM, if we just want distribution of S_T, we can verify against exact formula or run sim.
        # If param_ranges is provided (e.g. sigma range), we sample sigma uniformly for each run?
        # Or do we keep params fixed and just rely on Brownian noise for distribution?
        # Use Case A: "Risk Analysis" -> Fixed params, many paths, see distribution of S_T.
        # Use Case B: "Sensitivity" -> Variable params (e.g. varying volatility), see distribution of S_T.
        
        # Let's support both. If param_ranges has a key, we sample it.
        
        S0 = base_params.get("S0", 100.0)
        mu = base_params.get("mu", 0.05)
        sigma = base_params.get("sigma", 0.2)
        T = base_params.get("T", 1.0)
        dt = base_params.get("dt", 1.0/252.0) # Single step for speed if permissible? No, path properties matter.
        
        # Determine if we need full path or just final value.
        # For UQ histogram, usually final value.
        # We can optimize simulate_gbm to return just final value if requested, but let's reuse it.
        # Actually, running simulate_gbm 1000 times is slow if each has 252 steps.
        # Better: Run simulate_gbm ONCE with n_paths=n_sims if params are fixed!
        
        if not param_ranges:
             # Fast path: Vectorized GBM
             # Only if params are fixed.
             res = simulate_gbm(S0=S0, mu=mu, sigma=sigma, T=T, dt=dt, n_paths=n_sims)
             # Extract final prices
             paths = np.array(res["paths"])
             final_prices = paths[:, -1].tolist()
             results = final_prices
        else:
             # Slow path: Iterate and sample params
             # This is "Sensitivity Analysis"
             for _ in range(n_sims):
                 # Sample parameters
                 curr_sigma = sigma
                 if "sigma" in param_ranges:
                     curr_sigma = np.random.uniform(param_ranges["sigma"][0], param_ranges["sigma"][1])
                 
                 # Run single path
                 res = simulate_gbm(S0=S0, mu=mu, sigma=curr_sigma, T=T, dt=dt, n_paths=1)
                 results.append(res["paths"][0][-1])

    # 2. Option Pricing Distribution
    elif model_type == "pricing":
         # Black Scholes is deterministic given params.
         # So we MUST have param_ranges to get a distribution (Sensitivity).
         
         S = base_params.get("S", 100.0)
         K = base_params.get("K", 100.0)
         T = base_params.get("T", 1.0)
         r = base_params.get("r", 0.05)
         sigma = base_params.get("sigma", 0.2)
         option_type = base_params.get("option_type", "call")
         
         for _ in range(n_sims):
             # Sample
             curr_S = S
             if "S" in param_ranges:
                 curr_S = np.random.uniform(param_ranges["S"][0], param_ranges["S"][1])
             
             curr_sigma = sigma
             if "sigma" in param_ranges:
                 curr_sigma = np.random.uniform(param_ranges["sigma"][0], param_ranges["sigma"][1])
                 
             price = calculate_black_scholes(
                 S=curr_S, 
                 K=K, 
                 T=T, 
                 r=r, 
                 sigma=curr_sigma, 
                 option_type=option_type
             )["price"]
             results.append(price)
             
    else:
        raise ValueError(f"Unknown model type: {model_type}")

    duration = time.time() - start_time
    
    # Compute Statistics
    results_np = np.array(results)
    stats = {
        "mean": float(np.mean(results_np)),
        "std": float(np.std(results_np)),
        "min": float(np.min(results_np)),
        "max": float(np.max(results_np)),
        "var_95": float(np.percentile(results_np, 5)), # 5th percentile
        "var_99": float(np.percentile(results_np, 1))
    }
    
    # Compute Histogram Bins (Freedman-Diaconis or simple sqrt)
    # Simple 20 bins for UI
    hist, bin_edges = np.histogram(results_np, bins=20, density=False)
    
    return {
        "outcomes": results, # Might be too large for payload if N=10k? 10k floats is ~80KB. Fine.
        "stats": stats,
        "histogram": {
            "counts": hist.tolist(),
            "bins": bin_edges.tolist()
        },
        "timing": duration
    }
