"""Tests that exist to stop this project lying to itself.

Run: python3 tests/test_integrity.py   (from the crypto-desk directory)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd

from src.backtest import run_backtest
from src.costs import VENUES, Venue
from src.data import forward_open_to_open_returns, load_ohlcv, trim_illiquid_history, validate
from src.features import build_features
from src.stats import deflated_sharpe_ratio, sharpe
from src.strategies import REGISTRY

FAILURES: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {name}" + (f" -- {detail}" if detail else ""))
    if not condition:
        FAILURES.append(name)


def test_data_integrity(df: pd.DataFrame) -> None:
    print("\n1. Data integrity")
    rep = validate(df)
    check("OHLC relationships hold", rep.ohlc_violations == 0)
    check("no duplicate dates", rep.duplicate_dates == 0)
    check("no non-positive prices", rep.non_positive_prices == 0)
    check("no calendar gaps", rep.missing_days == 0, f"{rep.missing_days} gaps")


def test_features_are_causal(df: pd.DataFrame) -> None:
    """Truncating the future must not change the past.

    This is the decisive leakage test: if any feature uses forward information,
    its historical values will move when later rows are removed.
    """
    print("\n2. Feature causality (truncation invariance)")
    full = build_features(df)
    cut = len(df) - 250
    trunc = build_features(df.iloc[:cut])
    common = full.index[:cut]
    worst_col, worst_diff = None, 0.0
    for col in full.columns:
        a, b = full.loc[common, col], trunc.loc[common, col]
        both = a.notna() & b.notna()
        if both.sum() == 0:
            continue
        d = float((a[both] - b[both]).abs().max())
        if d > worst_diff:
            worst_col, worst_diff = col, d
    check("no feature changes when future is removed", worst_diff < 1e-9,
          f"worst={worst_col} delta={worst_diff:.3e}")


def test_strategies_are_causal(df: pd.DataFrame) -> None:
    print("\n3. Strategy causality (truncation invariance)")
    cut = len(df) - 250
    for name, strat in REGISTRY.items():
        if name == "random":
            continue  # seeded RNG is length-dependent by construction
        p = strat.param_sets()[0]
        full = strat.positions(df, **p)
        trunc = strat.positions(df.iloc[:cut], **p)
        d = float((full.iloc[:cut] - trunc).abs().max())
        check(f"{name} is causal", d < 1e-9, f"max delta={d:.3e}")


def test_return_alignment(df: pd.DataFrame) -> None:
    """The return at t must be built from prices strictly after t."""
    print("\n4. Signal/execution alignment")
    fwd = forward_open_to_open_returns(df)
    i = 500
    t = df.index[i]
    expected = df["open"].iloc[i + 2] / df["open"].iloc[i + 1] - 1
    check("fwd_ret[t] == open[t+2]/open[t+1]-1", abs(fwd.loc[t] - expected) < 1e-12)
    check("last two rows are NaN (no future to trade into)", fwd.iloc[-2:].isna().all())

    # A perfect-foresight strategy must be wildly profitable. If it is not, the
    # wiring is broken; if a normal strategy matches it, there is leakage.
    cheat = np.sign(fwd).fillna(0.0)
    res = run_backtest(df, cheat, VENUES["cex_maker"])
    check("perfect-foresight strategy is hugely profitable", sharpe(res.net_returns) > 5,
          f"sharpe={sharpe(res.net_returns):.1f}")


def test_costs_bite(df: pd.DataFrame) -> None:
    print("\n5. Cost model")
    free = Venue("free", 0, 0, 0)
    churn = pd.Series(np.tile([1.0, -1.0], len(df))[: len(df)], index=df.index)
    r_free = run_backtest(df, churn, free)
    r_paid = run_backtest(df, churn, VENUES["base_amm_realistic"])
    check("costs reduce returns", r_paid.net_returns.mean() < r_free.net_returns.mean())
    check("a daily-flipping strategy is destroyed by AMM costs",
          r_paid.metrics["total_return"] < -0.9,
          f"total={r_paid.metrics['total_return']:.1%}")

    # Crossing from short to long is two units of turnover, not one.
    flip = pd.Series([0.0] + [1.0] * 5 + [-1.0] * 5, index=df.index[:11])
    r = run_backtest(df.iloc[:11], flip, VENUES["cex_taker"])
    per_side = VENUES["cex_taker"].cost_bps_per_side * 1e-4
    check("a -1 -> +1 reversal is charged two units of turnover",
          abs(r.costs.iloc[6] - 2 * per_side) < 1e-9,
          f"charged={r.costs.iloc[6]:.6f} expected={2*per_side:.6f}")


def test_fast_path_matches_loop(df: pd.DataFrame) -> None:
    """The vectorised path is an optimisation, not a different model."""
    print("\n5b. Vectorised fast path equals the explicit loop")
    rng = np.random.default_rng(3)
    pos = pd.Series(rng.choice([-1.0, 0.0, 0.5, 1.0], len(df)), index=df.index)
    v = VENUES["cex_taker"]
    fast = run_backtest(df, pos, v)
    # Force the loop by giving the venue a negligible fixed cost.
    slow_venue = Venue(v.name, v.fee_bps, v.spread_bps, v.impact_bps, gas_usd=1e-12)
    slow = run_backtest(df, pos, slow_venue)
    d = float((fast.net_returns - slow.net_returns).abs().max())
    check("fast path net returns match the loop", d < 1e-9, f"max delta={d:.3e}")


def test_stats_reject_noise() -> None:
    print("\n6. Statistics reject noise")
    rng = np.random.default_rng(42)
    noise = pd.Series(rng.normal(0, 0.02, 1500))
    d1 = deflated_sharpe_ratio(noise, 1)
    d5000 = deflated_sharpe_ratio(noise, 5000)
    check("DSR rejects a zero-mean series", d1["dsr"] < 0.95, f"dsr={d1['dsr']:.3f}")
    check("search intensity raises the bar", d5000["expected_max_sharpe_ann"] > d1["expected_max_sharpe_ann"],
          f"1 trial bar={d1['expected_max_sharpe_ann']:.2f} vs 5000 bar={d5000['expected_max_sharpe_ann']:.2f}")

    # The claim under evaluation: 5000 trials, keep the winner.
    good = pd.Series(rng.normal(0.0018, 0.02, 1500))
    check("a Sharpe-1.7 result fails once 5000 trials are admitted",
          deflated_sharpe_ratio(good, 5000)["dsr"] < 0.95,
          f"sharpe={sharpe(good):.2f} dsr={deflated_sharpe_ratio(good, 5000)['dsr']:.3f}")


def test_no_short_on_spot(df: pd.DataFrame) -> None:
    print("\n7. Venue constraints are enforced")
    short = pd.Series(-1.0, index=df.index)
    r = run_backtest(df, short, VENUES["base_amm_realistic"])
    check("spot-only venue cannot hold a short", (r.positions >= 0).all())


def main() -> int:
    df = trim_illiquid_history(load_ohlcv())
    print(f"Testing on {len(df)} bars, {df.index.min().date()} to {df.index.max().date()}")
    test_data_integrity(df)
    test_features_are_causal(df)
    test_strategies_are_causal(df)
    test_return_alignment(df)
    test_costs_bite(df)
    test_fast_path_matches_loop(df)
    test_stats_reject_noise()
    test_no_short_on_spot(df)
    print("\n" + "=" * 60)
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S): {', '.join(FAILURES)}")
        return 1
    print("All integrity tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
