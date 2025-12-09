import numpy as np
from scipy.stats import norm
from typing import Dict, List, Literal

def simulate_delta_hedging(
    *,
    S0: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    mu: float,
    option_type: Literal["call", "put"] = "call",
    rebalance_freq: str = "daily"  # daily, weekly
) -> Dict[str, List[float]]:
    """
    Simulate the P&L of a delta-hedged short option position.
    
    Strategy:
    1. Sell Option at t=0 (Receive Premium).
    2. Buy Delta * S0 shares to hedge (Cost).
    3. Rebalance Delta at discrete intervals.
    4. Close position at T.
    
    Returns
    -------
    dict with time series for:
    - stock_price
    - option_price
    - delta
    - portfolio_value (PnL)
    """
    
    # Time setup
    dt_map = {"daily": 1/252.0, "weekly": 1/52.0}
    dt = dt_map.get(rebalance_freq, 1/252.0)
    N = int(T / dt)
    t_steps = np.linspace(0, T, N + 1)
    
    # 1. Generate GBM Path
    # dS = S * mu * dt + S * sigma * dW
    # S(t) = S0 * exp((mu - 0.5*sigma^2)t + sigma*W(t))
    dW = np.random.normal(0, np.sqrt(dt), size=N)
    W = np.cumsum(dW)
    W = np.insert(W, 0, 0.0)
    
    drift = (mu - 0.5 * sigma**2) * t_steps
    diffusion = sigma * W
    S = S0 * np.exp(drift + diffusion)
    
    # Vectors to store results
    option_prices = np.zeros(N + 1)
    deltas = np.zeros(N + 1)
    pnls = np.zeros(N + 1)
    
    # Tracking Account
    # Cash balance calculates interest earned/paid on borrowing
    cash = 0.0
    shares_held = 0.0
    
    # Simulation Loop
    for i in range(N + 1):
        curr_t = t_steps[i]
        curr_S = S[i]
        time_to_maturity = T - curr_t
        
        # Calculate BS Price and Delta
        bs_res = _black_scholes(curr_S, K, max(time_to_maturity, 1e-6), r, sigma, option_type)
        curr_opt_val = bs_res['price']
        curr_delta = bs_res['delta']
        
        if i == 0:
            # Initial Setup: Short Option, Long Delta Shares
            # Cash flow: +Premium - (Shares * S)
            premium_received = curr_opt_val
            shares_held = curr_delta
            cost_of_shares = shares_held * curr_S
            
            cash = premium_received - cost_of_shares
            
            # Initial PnL is usually 0 (or spread cost) - technically 0 theoretically
            # PnL = Asset (Stock + Cash) - Liability (Option value)
            # PnL = (shares_held * S + cash) - curr_opt_val
            #     = (delta * S + (Premium - delta * S)) - Premium = 0
            pnls[i] = 0.0
            
        else:
            # Rebalance
            # Apply interest to cash from previous step
            interest = cash * (np.exp(r * dt) - 1)
            cash += interest
            
            if i < N:
                # Adjust Hedge
                # We need `curr_delta` shares. We have `shares_held`.
                shares_to_buy = curr_delta - shares_held
                cost = shares_to_buy * curr_S
                
                cash -= cost
                shares_held = curr_delta
            else:
                # Expiry (i == N)
                # Option Payoff (Liability)
                payoff = 0.0
                if option_type == "call":
                    payoff = max(curr_S - K, 0)
                else:
                    payoff = max(K - curr_S, 0)
                
                # We hold shares_held. Value = shares_held * S
                # But typically we liquidate everything or settle.
                # Let's value the portfolio:
                # Value = SharesValue + Cash - Payoff
                pass

        # Record State
        option_prices[i] = curr_opt_val
        deltas[i] = curr_delta
        
        # Mark to Market PnL
        # PnL = (Shares * CurrentPrice + Cash) - CurrentOptionPrice
        portfolio_asset_value = shares_held * curr_S + cash
        pnls[i] = portfolio_asset_value - curr_opt_val

    return {
        "time": t_steps.tolist(),
        "stock_price": S.tolist(),
        "option_price": option_prices.tolist(),
        "delta": deltas.tolist(),
        "pnl": pnls.tolist()
    }

def _black_scholes(S, K, T, r, sigma, type_):
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if type_ == "call":
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        delta = norm.cdf(d1)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        delta = norm.cdf(d1) - 1
        
    return {"price": price, "delta": delta}
