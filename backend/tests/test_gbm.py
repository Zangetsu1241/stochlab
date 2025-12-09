import pytest
import numpy as np
from app.solvers.gbm import simulate_gbm

def test_gbm_basic_simulation():
    result = simulate_gbm(S0=100, mu=0.05, sigma=0.2, T=1.0, dt=0.01, n_paths=1)
    assert "time" in result
    assert "paths" in result
    assert len(result["paths"]) == 1
    assert len(result["time"]) == len(result["paths"][0])
    assert result["paths"][0][0] == 100.0

def test_gbm_multi_path():
    n = 10
    result = simulate_gbm(S0=100, mu=0.05, sigma=0.2, T=1.0, dt=0.1, n_paths=n)
    assert len(result["paths"]) == n
    
def test_gbm_deterministic():
    # If sigma=0, outcome should be deterministic growth: S0 * exp(mu * t)
    S0, mu, T = 100, 0.1, 1.0
    result = simulate_gbm(S0=S0, mu=mu, sigma=0.0, T=T, dt=0.1, n_paths=1)
    final_price = result["paths"][0][-1]
    expected_price = S0 * np.exp(mu * T)
    assert np.isclose(final_price, expected_price, atol=1e-2)

def test_gbm_validation():
    with pytest.raises(ValueError):
        simulate_gbm(S0=-100, mu=0.05, sigma=0.2, T=1.0, dt=0.01)
    with pytest.raises(ValueError):
        simulate_gbm(S0=100, mu=0.05, sigma=-0.2, T=1.0, dt=0.01)
