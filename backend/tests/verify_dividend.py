
import requests
import numpy as np
from scipy.stats import norm

def verify_black_scholes_dividend():
    url = "http://127.0.0.1:8000/api/v1/pricing/black-scholes"
    
    # Parameters
    S = 100
    K = 100
    T = 1
    r = 0.05
    sigma = 0.2
    q = 0.02 # 2% dividend yield
    
    payload = {
        "S": S, "K": K, "T": T, "r": r, "sigma": sigma, "q": q, "option_type": "call"
    }
    
    # Expected Result (Manual Calculation)
    d1 = (np.log(S/K) + (r - q + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    expected_price = S * np.exp(-q*T) * norm.cdf(d1) - K * np.exp(-r*T) * norm.cdf(d2)
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        print(f"Input: {payload}")
        print(f"API Price: {data['price']}")
        print(f"Expected Price: {expected_price}")
        
        if abs(data['price'] - expected_price) < 1e-4:
            print("SUCCESS: Price matches expected value with dividend yield.")
        else:
            print("FAILURE: Price mismatch.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_black_scholes_dividend()
