#!/usr/bin/env python3
"""Full evaluation: audit the proposal, then test whether anything survives.

    python3 run_evaluation.py [--quick]

Writes a markdown report to reports/evaluation.md.
"""
from __future__ import annotations

import argparse
import sys
import warnings
from datetime import date
from pathlib import Path

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import pandas as pd

from src.backtest import run_backtest
from src.costs import VENUES
from src.data import load_ohlcv, trim_illiquid_history, validate
from src.stats import deflated_sharpe_ratio
from src.strategies import REGISTRY
from src.walkforward import WalkForwardConfig, verdict, walk_forward

REPORTS = Path(__file__).resolve().parent / "reports"
OUT: list[str] = []


def emit(line: str = "") -> None:
    print(line)
    OUT.append(line)


def audit_the_claims(df: pd.DataFrame) -> None:
    """Test the three load-bearing claims of the source proposal."""
    emit("## 1. Auditing the proposal's claims\n")
    r = df["close"].pct_change().dropna()
    end = df.index.max()

    emit("### Claim: \"getting above 50 percent accuracy\" is the target\n")
    emit("| Window | Days | Up-day rate | Mean daily |")
    emit("|---|---|---|---|")
    for label, days in (("full sample", 99999), ("last 5y", 1825), ("last 3y", 1095), ("last 1y", 365)):
        w = r[r.index > end - pd.Timedelta(days=days)]
        emit(f"| {label} | {len(w)} | {(w > 0).mean():.1%} | {w.mean()*100:+.3f}% |")
    base = (r[r.index > end - pd.Timedelta(days=1095)] > 0).mean()
    emit(f"\n**Always predicting \"up\" scores {base:.1%} for free.** 50% is not the "
         "benchmark; the base rate is. An edge is what you have *above* it.\n")

    emit("### Claim: run 2,000-5,000 simulations, keep what beats 50%\n")
    y = (r[r.index > end - pd.Timedelta(days=1095)] > 0).astype(int).values
    n = len(y)
    rng = np.random.default_rng(7)
    emit("| Simulations run | Best accuracy found | Skill involved |")
    emit("|---|---|---|")
    for trials in (100, 1000, 2000, 5000):
        accs = np.array([(rng.integers(0, 2, n) == y).mean() for _ in range(trials)])
        emit(f"| {trials:,} | {accs.max():.1%} | none (coin flips) |")
    emit(f"\n**{5000:,} coin flips produce a best result near 55% on {n} days of real BTC "
         "data.** Selecting the maximum of a large search is not measurement, it is "
         "sampling the right tail of noise.\n")

    noise = pd.Series(rng.normal(0, 0.02, n))
    bar = deflated_sharpe_ratio(noise, 5000)["expected_max_sharpe_ann"]
    emit(f"Expressed as Sharpe: after 5,000 trials on {n} observations, a **zero-skill** "
         f"search is expected to produce a best annualised Sharpe of **{bar:.2f}**. "
         "Any result below that bar is indistinguishable from luck.\n")

    emit("### Claim: run it on Base L2 \"because fees are cheap\"\n")
    E = r[r.index > end - pd.Timedelta(days=1095)].abs().mean()
    emit(f"Mean absolute daily move (3y): **{E:.2%}**. Breakeven accuracy on $400:\n")
    emit("| Venue | Round-trip cost | Accuracy needed to break even |")
    emit("|---|---|---|")
    for v in VENUES.values():
        emit(f"| {v.name} | {v.round_trip_fraction(400):.3%} | **{v.breakeven_accuracy(E, 400):.1%}** |")
    emit("\nGas on Base is genuinely cheap. Gas is not the cost — the AMM fee and price "
         "impact are, and on a realistic pool they demand accuracy far above anything "
         "claimed. **The proposal optimises the smallest cost term and ignores the "
         "largest.**\n")

    emit("### Why accuracy is the wrong objective entirely\n")
    q = r.abs().quantile(0.5)
    small, large = r[r.abs() < q].abs().mean(), r[r.abs() >= q].abs().mean()
    emit(f"Small-move days average {small:.2%}; large-move days average {large:.2%} "
         f"({large/small:.1f}x). A model that is 58% right on small days and 45% right on "
         "large days has ~52% blended accuracy and **loses money before costs**. "
         "Accuracy weights every day equally; the market does not.\n")


def evaluate_strategies(df: pd.DataFrame, quick: bool) -> pd.DataFrame:
    emit("## 2. Walk-forward evaluation\n")
    cfg = WalkForwardConfig()
    emit(f"Expanding window, min train {cfg.min_train_days}d, test {cfg.test_days}d, "
         f"embargo {cfg.embargo_days}d. Parameters chosen only on data preceding each "
         "test block. Costs charged every bar.\n")

    venues = ["cex_taker"] if quick else ["cex_maker", "cex_taker", "base_amm_realistic"]
    rows = []
    for vk in venues:
        for name, strat in REGISTRY.items():
            res = walk_forward(df, strat, VENUES[vk], cfg)
            if not res.metrics:
                continue
            m = res.metrics
            rows.append({
                "strategy": name, "venue": vk,
                "sharpe": m["oos_sharpe"], "ci_lo": m["sharpe_ci_lo"], "ci_hi": m["sharpe_ci_hi"],
                "cagr": m["oos_cagr"], "max_dd": m["oos_max_dd"], "dsr": m["dsr"],
                "pbo": m["pbo"], "accuracy": m["directional_accuracy"],
                "trials": m["n_trials"], "final_equity": m["final_equity"],
                "verdict": verdict(m),
            })
    tbl = pd.DataFrame(rows).sort_values("sharpe", ascending=False)

    emit("| Strategy | Venue | OOS Sharpe | 95% CI | CAGR | Max DD | DSR | PBO | Dir. acc | Verdict |")
    emit("|---|---|---|---|---|---|---|---|---|---|")
    for _, x in tbl.iterrows():
        emit(f"| {x.strategy} | {x.venue} | {x.sharpe:.2f} | [{x.ci_lo:.2f}, {x.ci_hi:.2f}] | "
             f"{x.cagr:.1%} | {x.max_dd:.1%} | {x.dsr:.3f} | "
             f"{'n/a' if np.isnan(x.pbo) else f'{x.pbo:.2f}'} | {x.accuracy:.1%} | {x.verdict} |")
    emit()
    return tbl


def regime_check(df: pd.DataFrame) -> None:
    """The question that decides everything: does the edge still exist?"""
    emit("## 3. Regime check — is the edge still alive?\n")
    res = walk_forward(df, REGISTRY["trend_risk_managed"], VENUES["cex_taker"])
    oos = res.oos_returns
    emit("| Period | Days | Sharpe | Return |")
    emit("|---|---|---|---|")
    for yr, grp in oos.groupby(oos.index.year):
        s = grp.mean() / grp.std() * np.sqrt(365) if grp.std() > 0 else float("nan")
        emit(f"| {yr} | {len(grp)} | {s:.2f} | {(1+grp).prod()-1:+.1%} |")
    recent = oos[oos.index > oos.index.max() - pd.Timedelta(days=730)]
    s_recent = recent.mean() / recent.std() * np.sqrt(365) if recent.std() > 0 else float("nan")
    emit(f"\n**Last 24 months: Sharpe {s_recent:.2f}, return {(1+recent).prod()-1:+.1%}.**\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="one venue only")
    args = ap.parse_args()

    raw = load_ohlcv()
    rep = validate(raw)
    df = trim_illiquid_history(raw)

    emit(f"# Crypto Desk — Evaluation Report\n")
    emit(f"*Generated {date.today()} · BTC/USD daily · "
         f"{df.index.min().date()} to {df.index.max().date()} ({len(df)} bars)*\n")
    emit(f"Data integrity: `{rep.describe()}`\n")

    audit_the_claims(df)
    tbl = evaluate_strategies(df, args.quick)
    regime_check(df)

    emit("## 4. Gate outcome\n")
    passed = tbl[tbl.verdict == "FUNDABLE"]
    if len(passed) == 0:
        emit("**Nothing cleared the funding gate.** The correct action is not to deploy capital.\n")
    else:
        emit(f"{len(passed)} configuration(s) cleared the gate:\n")
        for _, x in passed.iterrows():
            emit(f"- `{x.strategy}` on `{x.venue}`: Sharpe {x.sharpe:.2f}, "
                 f"CAGR {x.cagr:.1%}, max DD {x.max_dd:.1%}, DSR {x.dsr:.3f}")
        emit("\nClearing the gate authorises **paper trading**, not capital. See PRD §6.\n")

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "evaluation.md").write_text("\n".join(OUT) + "\n")
    tbl.to_csv(REPORTS / "strategy_results.csv", index=False)
    print(f"\nWrote {REPORTS/'evaluation.md'} and {REPORTS/'strategy_results.csv'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
