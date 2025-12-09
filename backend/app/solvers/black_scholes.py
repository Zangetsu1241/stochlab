import numpy as np
from scipy.stats import norm
from typing import Dict, Union

def calculate_black_scholes(
    *,
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: str = "call"
) -> Dict[str, float]:
    """
    Calculate Black-Scholes price and Greeks for a European option.

    Parameters
    ----------
    S : float
        Spot price of the underlying asset.
    K : float
        Strike price of the option.
    T : float
        Time to expiration in years.
    r : float
        Risk-free interest rate (decimal, e.g., 0.05 for 5%).
    sigma : float
        Volatility of the underlying asset (decimal, e.g., 0.2 for 20%).
    option_type : str
        "call" or "put".

    Returns
    -------
    dict
        {
            "price": float,
            "delta": float,
            "gamma": float,
            "theta": float,
            "vega": float,
            "rho": float
        }
    """
    # Validation
    if S <= 0 or K <= 0 or sigma <= 0 or T <= 0:
        # Return zeros or Handle edge cases?
        # For valid standard BS, these must be positive. 
        # T -> 0 is a special case (intrinsic value), but let's handle strictly positive for now or return intrinsic.
        if T <= 0:
            return _calculate_intrinsic(S, K, option_type)
        if S <= 0 or K <= 0 or sigma <= 0:
             raise ValueError("S, K, and sigma must be positive.")

    option_type = option_type.lower()
    if option_type not in ["call", "put"]:
        raise ValueError("Option type must be 'call' or 'put'.")

    # D1 and D2 calculation
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    # CDF and PDF
    N_d1 = norm.cdf(d1)
    N_d2 = norm.cdf(d2)
    N_minus_d1 = norm.cdf(-d1)
    N_minus_d2 = norm.cdf(-d2)
    n_d1 = norm.pdf(d1) # Standard normal PDF

    # Pricing and Greeks
    price = 0.0
    delta = 0.0
    gamma = 0.0
    theta = 0.0
    vega = 0.0
    rho = 0.0

    # Common terms
    sqrt_T = np.sqrt(T)
    disc_K = K * np.exp(-r * T)
    
    if option_type == "call":
        price = S * N_d1 - disc_K * N_d2
        delta = N_d1
        rho = K * T * np.exp(-r * T) * N_d2
        theta = (- (S * n_d1 * sigma) / (2 * sqrt_T) 
                 - r * K * np.exp(-r * T) * N_d2)
    else: # put
        price = disc_K * N_minus_d2 - S * N_minus_d1
        delta = N_d1 - 1
        rho = -K * T * np.exp(-r * T) * N_minus_d2
        theta = (- (S * n_d1 * sigma) / (2 * sqrt_T) 
                 + r * K * np.exp(-r * T) * N_minus_d2)

    # Gamma and Vega are the same for Call and Put
    gamma = n_d1 / (S * sigma * sqrt_T)
    vega = S * sqrt_T * n_d1

    return {
        "price": float(price),
        "delta": float(delta),
        "gamma": float(gamma),
        "theta": float(theta),
        "vega": float(vega),
        "rho": float(rho)
    }

def _calculate_intrinsic(S, K, option_type):
    if option_type == "call":
        val = max(0, S - K)
        delta = 1.0 if S > K else 0.0
    else:
        val = max(0, K - S)
        delta = -1.0 if S < K else 0.0
    
    return {
        "price": float(val),
        "delta": float(delta),
        "gamma": 0.0,
        "theta": 0.0,
        "vega": 0.0,
        "rho": 0.0
    }
