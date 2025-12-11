import numpy as np
from scipy.stats import norm
from typing import Dict, List, Literal
from backend.app.solvers.black_scholes import calculate_black_scholes

def simulate_delta_hedging(
    *,
    S0: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    mu: float,
    q: float = 0.0,
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
    # dS = S * (mu - q) * dt + S * sigma * dW  <-- drift is mu, but risk-neutral drift is r-q. Real world drift is mu. 
    # Usually dividend drops price: dS = (mu - q) S dt + sigma S dW. 
    # BUT standard GBM definition: S_t includes dividends? 
    # No, typically S_t is price indices. If stock simulates Total Return, we assume dividends reinvested? 
    # No, option pricing assumes S is ex-dividend price.
    # So drift of Price Process is (mu - q).
    
    dW = np.random.normal(0, np.sqrt(dt), size=N)
    W = np.cumsum(dW)
    W = np.insert(W, 0, 0.0)
    
    # Real-world drift of the STOCK PRICE itself involves dividend drop
    # S(t) drift is mu - q
    net_mu = mu - q
    
    drift = (net_mu - 0.5 * sigma**2) * t_steps
    diffusion = sigma * W
    S = S0 * np.exp(drift + diffusion)
    
    # Vectors to store results
    option_prices = np.zeros(N + 1)
    deltas = np.zeros(N + 1)
    pnls = np.zeros(N + 1)
    
    # Tracking Account
    cash = 0.0
    shares_held = 0.0
    
    # Simulation Loop
    for i in range(N + 1):
        curr_t = t_steps[i]
        curr_S = S[i]
        time_to_maturity = T - curr_t
        
        # Calculate BS Price and Delta
        # Use our robust solver
        bs_res = calculate_black_scholes(
            S=curr_S, K=K, T=max(time_to_maturity, 1e-6), r=r, sigma=sigma, q=q, option_type=option_type
        )
        curr_opt_val = bs_res['price']
        curr_delta = bs_res['delta']
        
        if i == 0:
            # Initial Setup: Shor Option (-), Long Delta Shares (+)
            # Cash = Premium - Cost of Shares
            premium_received = curr_opt_val
            shares_held = curr_delta
            cost_of_shares = shares_held * curr_S
            
            cash = premium_received - cost_of_shares
            
            # Initial PnL = 0
            pnls[i] = 0.0
            
        else:
            # 1. Accrue Interest on Cash
            # Discrete compounding match dt
            interest_earned = cash * (np.exp(r * dt) - 1)
            cash += interest_earned
            
            # 2. Accrue Dividends on Shares Held
            # If we hold shares, we receive continuous dividend yield q
            # Cash += Shares * S * (exp(q*dt) - 1)
            # dividend_received = shares_held * S[i-1] * (np.exp(q * dt) - 1)
            # Or use approximation q * S * dt. Exponential is more rigorous.
            # Note: We use previous price or average price? Continuous yield implies we earned it over the interval.
            # Using S[i-1] (start of interval) is standard for forward Euler.
            dividend_cash = shares_held * S[i-1] * (np.exp(q * dt) - 1)
            cash += dividend_cash
            
            if i < N:
                # Rebalance Hedge
                shares_to_buy = curr_delta - shares_held
                cost = shares_to_buy * curr_S
                
                cash -= cost
                shares_held = curr_delta
            else:
                # Expiry Settlement
                pass # We just mark to market below

        # Record State
        option_prices[i] = curr_opt_val
        deltas[i] = curr_delta
        
        # Mark to Market PnL
        # PnL = (Asset Value) - (Liability Value)
        # Asset = Shares * S + Cash
        # Liability = Option Value
        portfolio_asset_value = shares_held * curr_S + cash
        pnls[i] = portfolio_asset_value - curr_opt_val

    return {
        "time": t_steps.tolist(),
        "stock_price": S.tolist(),
        "option_price": option_prices.tolist(),
        "delta": deltas.tolist(),
        "pnl": pnls.tolist()
    }

