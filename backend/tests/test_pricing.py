import pytest
import numpy as np
from app.solvers.black_scholes import calculate_black_scholes

def test_bs_call_pricing():
    # Benchmark: S=100, K=100, T=1, r=0.05, sigma=0.2
    # Call Price approx 10.45
    result = calculate_black_scholes(S=100, K=100, T=1, r=0.05, sigma=0.2, option_type="call")
    assert np.isclose(result["price"], 10.45, atol=0.01)
    # Delta for ATM call approx 0.6 (due to drift) -> actually N(d1) > 0.5
    assert 0.5 < result["delta"] < 1.0

def test_bs_put_pricing():
    # Put-Call Parity: C - P = S - K * exp(-rT)
    # 10.45 - P = 100 - 100 * exp(-0.05) = 100 - 95.12 = 4.88
    # P = 10.45 - 4.88 = 5.57
    result = calculate_black_scholes(S=100, K=100, T=1, r=0.05, sigma=0.2, option_type="put")
    assert np.isclose(result["price"], 5.57, atol=0.01)
    # Delta for ATM put approx -0.4
    assert -1.0 < result["delta"] < -0.3

def test_put_call_parity():
    S, K, T, r, sigma = 100, 110, 0.5, 0.03, 0.25
    call = calculate_black_scholes(S=S, K=K, T=T, r=r, sigma=sigma, option_type="call")
    put = calculate_black_scholes(S=S, K=K, T=T, r=r, sigma=sigma, option_type="put")
    
    # LHS: C - P
    lhs = call["price"] - put["price"]
    # RHS: S - K * e^(-rT)
    rhs = S - K * np.exp(-r * T)
    
    assert np.isclose(lhs, rhs, atol=1e-4)

def test_greeks_signs():
    # Long Call: Delta > 0, Gamma > 0, Vega > 0
    res = calculate_black_scholes(S=100, K=100, T=1, r=0.05, sigma=0.2, option_type="call")
    assert res["delta"] > 0
    assert res["gamma"] > 0
    assert res["vega"] > 0
    
    # Long Put: Delta < 0, Gamma > 0, Vega > 0
    res = calculate_black_scholes(S=100, K=100, T=1, r=0.05, sigma=0.2, option_type="put")
    assert res["delta"] < 0
    assert res["gamma"] > 0
    assert res["vega"] > 0

def test_deep_itm_otm():
    # Deep ITM Call (S >> K) -> Delta -> 1
    res = calculate_black_scholes(S=200, K=100, T=1, r=0.05, sigma=0.2, option_type="call")
    assert np.isclose(res["delta"], 1.0, atol=0.01)
    
    # Deep OTM Call (S << K) -> Delta -> 0
    res = calculate_black_scholes(S=50, K=100, T=1, r=0.05, sigma=0.2, option_type="call")
    assert np.isclose(res["delta"], 0.0, atol=0.01)
