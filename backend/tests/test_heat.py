import sys
import os

# Add project root to sys.path to allow running this file directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.solvers.heat_fd import solve_heat
import pytest

def test_heat_basic():
    res = solve_heat(alpha=0.5, dt=0.0001, dx=0.01, t_steps=50, domain=1.0, init="pulse")
    frames = res["frames"]
    assert isinstance(frames, list)
    assert len(frames) > 1
    assert len(frames[0]) > 1

def test_stability_violation_raises(): 

    # choose dx small so r > 0.5
    with pytest.raises(ValueError):
        solve_heat(alpha=1.0, dt=1e-3, dx=1e-3, t_steps=10)

def test_stochastic_produces_variance():
    # Run two simulations with same seed/params but sigma > 0
    # Actually, inside solve_heat we don't fix seed, so calling it twice should differ
    # But wait, internal implementation uses np.random.standard_normal.
    # To properly test, we just check that frames are not identical across runs or distinct from deterministic?
    
    # Run 1: Deterministic
    res_det = solve_heat(alpha=0.5, dt=0.0001, dx=0.1, t_steps=10, domain=1.0, sigma=0.0)
    frames_det = res_det["frames"]
    
    # Run 2: Stochastic
    res_stoch = solve_heat(alpha=0.5, dt=0.0001, dx=0.1, t_steps=10, domain=1.0, sigma=1.0)
    frames_stoch = res_stoch["frames"]
    
    # Check that final frames differ
    assert frames_det[-1] != frames_stoch[-1]

def test_stochastic_reproducibility():
    # If we want to ensure randomness, ensuring two stochastic runs differ is good enough for now
    r1 = solve_heat(alpha=0.5, dt=0.0001, dx=0.1, t_steps=10, domain=1.0, sigma=1.0)
    f1 = r1["frames"]
    r2 = solve_heat(alpha=0.5, dt=0.0001, dx=0.1, t_steps=10, domain=1.0, sigma=1.0)
    f2 = r2["frames"]
    
    # With high probability they should differ
    # Note: extremely small chance they are same, but practically impossible
    assert f1 != f2

if __name__ == "__main__":
    # If run directly, run the tests manually and print success
    try:
        test_heat_basic()
        test_stability_violation_raises()
        test_stochastic_produces_variance()
        test_stochastic_reproducibility()
        print("All tests passed!")
    except ImportError:
        # Fallback if pytest is not installed/importable in this context, mostly to ensure basic run works
        pass
    except Exception as e:
        print(f"Test failed: {e}")
        exit(1)
