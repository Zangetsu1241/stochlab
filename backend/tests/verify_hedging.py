
import requests
import numpy as np

def verify_hedging_pnl():
    url = "http://127.0.0.1:8000/api/v1/hedging/simulate"
    
    # Parameters for a "perfect" hedge scenario (low volatility, high dividend)
    # With q=5%, if we don't account for it, we'd lose ~5% per year on the stock position relative to price drop.
    params = {
        "S0": 100,
        "K": 100,
        "T": 1.0,
        "r": 0.05,
        "sigma": 0.001, # Almost deterministic to isolate dividend/drift effect
        "mu": 0.05,
        "q": 0.05,  # High dividend
        "option_type": "call",
        "rebalance_freq": "daily"
    }
    
    try:
        response = requests.post(url, json=params)
        response.raise_for_status()
        data = response.json()
        
        pnl = data["pnl"]
        final_pnl = pnl[-1]
        
        print(f"Final PnL with q={params['q']}, sigma={params['sigma']}: {final_pnl}")
        
        # In a frictionless, low vol world, Gamma PnL is small.
        # Major PnL drivers would be missing drift or dividend terms.
        # If dividend logic handles cash flow, PnL should be close to 0 (gamma loss from small sigma is tiny).
        
        if abs(final_pnl) < 1.0:
            print("SUCCESS: PnL is stable and near zero as expected for low-vol hedge.")
        else:
            print("WARNING: PnL is significant. Check dividend accounting.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_hedging_pnl()
