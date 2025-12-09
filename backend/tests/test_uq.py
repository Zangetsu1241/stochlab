
import pytest
from backend.app.solvers.monte_carlo import run_parameter_sweep

def test_sweep_gbm_simple():
    """Test standard GBM risk analysis (fixed params, stochastic outcome)."""
    base_params = {"S0": 100, "mu": 0.05, "sigma": 0.2, "T": 1.0}
    res = run_parameter_sweep("gbm", base_params, {}, n_sims=500)
    
    assert "stats" in res
    assert "histogram" in res
    assert len(res["outcomes"]) == 500
    # Mean should be close to S0 * exp(mu) = 100 * exp(0.05) ~= 105.12
    # But Monte Carlo has variance.
    assert 90 < res["stats"]["mean"] < 120

def test_sweep_pricing_sensitivity():
    """Test Option Pricing sensitivity (variable params, deterministic function)."""
    base_params = {"S": 100, "K": 100, "T": 1.0, "r": 0.05, "option_type": "call"}
    # Sweep sigma [0.1, 0.5]
    ranges = {"sigma": [0.1, 0.5]}
    
    res = run_parameter_sweep("pricing", base_params, ranges, n_sims=100)
    
    assert len(res["outcomes"]) == 100
    # Prices should vary.
    assert res["stats"]["min"] < res["stats"]["max"]
    assert res["stats"]["min"] > 0 # Call price > 0

def test_sweep_invalid_model():
    with pytest.raises(ValueError):
        run_parameter_sweep("unknown", {}, {})

def test_sweep_max_limit():
    with pytest.raises(ValueError):
        run_parameter_sweep("gbm", {}, {}, n_sims=10001)
