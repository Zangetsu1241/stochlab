import pytest
import numpy as np
from app.solvers.hedging import simulate_delta_hedging

def test_hedging_basic():
    res = simulate_delta_hedging(
        S0=100, K=100, T=1, r=0.05, sigma=0.2, mu=0.05,
        rebalance_freq="daily"
    )
    assert len(res["time"]) > 200
    assert len(res["pnl"]) == len(res["time"])
    # Initial PnL should be 0 (fair value transaction)
    assert np.isclose(res["pnl"][0], 0.0)

def test_zero_volatility_hedge():
    # If sigma=0 (and we use a very small sigma in BS to avoid div/0 or logic handles it),
    # BS is perfect prediction. Hedge should be static or perfectly predictive.
    # However, passing sigma=0 to BS usually breaks D1/D2 formulas div by zero.
    # Let's pass a very small sigma or check if the solver fails.
    # The solver uses normal distribution. 
    # Let's assume low volatility -> small PnL variance.
    res = simulate_delta_hedging(
        S0=100, K=100, T=1, r=0.0, sigma=0.01, mu=0.0,
        rebalance_freq="daily"
    )
    # With zero rates and drift and low vol, PnL should be very small range.
    final_pnl = res["pnl"][-1]
    assert abs(final_pnl) < 1.0 # Arbitrary small bound

def test_short_put_hedging():
    res = simulate_delta_hedging(
        S0=100, K=100, T=1, r=0.05, sigma=0.2, mu=0.05,
        option_type="put"
    )
    assert len(res["time"]) > 0
    # Put delta is negative. so we buy delta shares -> negative shares (short stock) to hedge short put?
    # Wait: Short Put -> Positive Delta exposure?
    # Long Put Delta is -0.5. Short Put Delta is +0.5.
    # To hedge Short Put (Long Delta), we need Short Stock (Negative Delta).
    # My solver code:
    # shares_held = curr_delta. For Put, this is (N(d1)-1), which is negative.
    # So we hold negative shares (short stock). Correct.
    assert res["delta"][0] < 0 
