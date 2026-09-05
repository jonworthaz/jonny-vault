"""Statistical power of the funding gate.

A gate that rejects everything is not rigorous, it is broken -- and it is exactly
as dangerous as one that passes everything, because it makes the platform useless
for its actual purpose. This suite injects strategies with KNOWN predictive power
and asserts the gate can tell them apart from noise.

An adversarial review pointed out that the gate's power was assumed rather than
tested, and that this is the check which would have caught the project's earlier
defects from the inside. Slower than the integrity suite; run it after any change
to `verdict`, `stats.py` or `walkforward.py`.

    python3 tests/test_gate_power.py
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd

from src.costs import VENUES
from src.data import forward_open_to_open_returns, load_ohlcv, trim_illiquid_history
from src.strategies import (
    REGISTRY, Strategy, apply_trade_buffer, volatility_target,
)
from src.walkforward import (
    WalkForwardConfig, apply_pooled_variance, pool_trial_variance, verdict, walk_forward,
)

FAILURES: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    print(f"  [{'PASS' if condition else 'FAIL'}] {name}" + (f" -- {detail}" if detail else ""))
    if not condition:
        FAILURES.append(name)


def oracle_strategy(ic: float, seed: int = 0) -> Strategy:
    """A strategy whose signal has a known information coefficient `ic`.

    The signal is a blend of the true forward return and pure noise, so `ic` is
    the correlation between signal and outcome. ic=0 is a coin flip; a real daily
    predictor achieving ic=0.15 would be exceptional.

    This deliberately uses future information -- that is the point. It is a
    calibration instrument, never a candidate, and it lives only in tests.
    """
    def fn(df: pd.DataFrame, target_vol: float = 0.40, buffer: float = 0.15) -> pd.Series:
        fwd = forward_open_to_open_returns(df).fillna(0.0)
        z = (fwd - fwd.mean()) / fwd.std()
        rng = np.random.default_rng(seed)
        noise = pd.Series(rng.standard_normal(len(df)), index=df.index)
        blended = ic * z + np.sqrt(max(1 - ic ** 2, 0.0)) * noise
        raw = pd.Series(np.sign(blended), index=df.index)
        return apply_trade_buffer(
            volatility_target(raw, df, target_ann_vol=target_vol, max_leverage=1.0),
            buffer=buffer,
        )

    # The volatility grid reaches lower than the candidate strategies' because a
    # genuinely good strategy would be risk-managed to an investable drawdown.
    # Without this the oracle fails the drawdown clause on risk appetite rather
    # than on any lack of edge, which is not what this test is measuring.
    return Strategy(f"oracle_ic_{ic:.2f}", fn,
                    {"target_vol": (0.15, 0.25, 0.40), "buffer": (0.10, 0.20)})


def main() -> int:
    df = trim_illiquid_history(load_ohlcv())
    venue = VENUES["cex_taker"]
    cfg = WalkForwardConfig()

    print(f"Gate power test on {len(df)} bars, venue: {venue.name}\n")
    print("Building the forecast-free control...")
    abl = walk_forward(df, REGISTRY["no_signal_ablation"], venue, cfg)
    abl_ret = abl.oos_returns
    print(f"  control OOS Sharpe = {abl.metrics['oos_sharpe']:.3f}\n")

    results = {}
    print("Injecting strategies with known information coefficient:")
    print(f"  {'IC':>6} {'Sharpe':>8} {'alpha_t':>9} {'span_t':>8} {'DSR':>7} {'maxDD':>7}  verdict")
    for ic in (0.00, 0.10, 0.20, 0.30):
        res = walk_forward(df, oracle_strategy(ic), venue, cfg, ablation_returns=abl_ret)
        apply_pooled_variance(res, pool_trial_variance([res, abl]))
        m = res.metrics
        results[ic] = (m, verdict(m))
        print(f"  {ic:>6.2f} {m['oos_sharpe']:>8.2f} {m['alpha_t']:>9.2f} "
              f"{m['alpha_t_vs_ablation']:>8.2f} {m['dsr']:>7.3f} {m['oos_max_dd']:>7.1%}"
              f"  {results[ic][1][:44]}")

    print("\nAssertions:")
    check("a zero-skill oracle is REJECTED",
          results[0.00][1] != "FUNDABLE",
          f"ic=0.00 -> {results[0.00][1][:40]}")
    # The gate must be able to say yes. Note it is a RISK gate as well as an edge
    # gate: a very strong signal can still be rejected for realised drawdown, and
    # that is a deliberate decision for an account that cannot lose the stack --
    # not a failure of statistical power. So the requirement is that some level
    # of genuine edge passes, and that the statistical clauses clear cleanly.
    passing = [ic for ic, (_, v) in results.items() if v == "FUNDABLE"]
    check("the gate can pass a genuinely good strategy",
          len(passing) > 0,
          f"FUNDABLE at IC {passing}" if passing else "nothing passed at any IC")
    check("edge is detected well below the strongest tested signal",
          results[0.20][1] == "FUNDABLE",
          f"ic=0.20 -> {results[0.20][1][:60]}")
    for ic, (m, v) in results.items():
        if v.startswith("REJECT") and "drawdown" in v and ic >= 0.20:
            print(f"    note: IC {ic:.2f} rejected on realised drawdown "
                  f"({m['oos_max_dd']:.1%}) despite alpha t = {m['alpha_t']:.2f} "
                  "-- a risk decision, not a power failure")
    check("the statistical clauses clear well before ic=0.30",
          results[0.20][0]["alpha_t"] > 2.5
          and results[0.20][0]["alpha_t_vs_ablation"] > 2.0
          and results[0.20][0]["dsr"] > 0.95,
          f"ic=0.20: alpha_t={results[0.20][0]['alpha_t']:.2f} "
          f"span_t={results[0.20][0]['alpha_t_vs_ablation']:.2f} "
          f"dsr={results[0.20][0]['dsr']:.3f}")
    check("Sharpe increases monotonically with true edge",
          results[0.00][0]["oos_sharpe"] < results[0.10][0]["oos_sharpe"]
          < results[0.20][0]["oos_sharpe"] < results[0.30][0]["oos_sharpe"])
    check("alpha t-statistic increases with true edge",
          results[0.00][0]["alpha_t"] < results[0.30][0]["alpha_t"])

    print("\n" + "=" * 62)
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S): {', '.join(FAILURES)}")
        print("A gate that cannot pass a genuinely good strategy is broken.")
        return 1
    print("Gate has statistical power: it separates real edge from noise.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
