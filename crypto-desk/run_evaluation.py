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
from src.benchmark import buy_and_hold_returns
from src.walkforward import (
    PROJECT_SEARCH_BUDGET, WalkForwardConfig, verdict, walk_forward,
)

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


def evaluate_strategies(df: pd.DataFrame, quick: bool) -> tuple[pd.DataFrame, float]:
    emit("## 2. Walk-forward evaluation\n")
    cfg = WalkForwardConfig()
    emit(f"Rolling {cfg.rolling_train_days}d training window, {cfg.test_days}d test blocks, "
         f"{cfg.embargo_days}d embargo. Parameters chosen only on data preceding each test "
         f"block. Costs charged every bar. Trial count deflated at "
         f"N={PROJECT_SEARCH_BUDGET} (the project's honest search budget, not one grid).\n")

    # The control experiment: the same risk machinery with the forecast deleted.
    abl = walk_forward(df, REGISTRY["no_signal_ablation"], VENUES["cex_taker"], cfg)
    abl_sharpe = abl.metrics["oos_sharpe"]
    emit("### The control experiment\n")
    emit("Before reading any result below: this is **always long, volatility-targeted, "
         "no forecast of any kind**. It contains zero predictive information.\n")
    emit(f"> **Control OOS Sharpe: {abl_sharpe:.3f}** "
         f"(CAGR {abl.metrics['oos_cagr']:.1%}, max DD {abl.metrics['oos_max_dd']:.1%})\n")
    emit("Any strategy that does not beat this number has a signal that contributes "
         "nothing. This clause was added after an adversarial review found the first "
         "version of this gate certifying beta as alpha.\n")

    venues = ["cex_taker"] if quick else ["cex_maker", "cex_taker", "base_amm_realistic"]
    rows = []
    for vk in venues:
        for name, strat in REGISTRY.items():
            res = walk_forward(df, strat, VENUES[vk], cfg, ablation_sharpe=abl_sharpe)
            if not res.metrics:
                continue
            m = res.metrics
            rows.append({
                "strategy": name, "venue": vk, "sharpe": m["oos_sharpe"],
                "ci_lo": m["sharpe_ci_lo"], "ci_hi": m["sharpe_ci_hi"],
                "cagr": m["oos_cagr"], "max_dd": m["oos_max_dd"], "dsr": m["dsr"],
                "pbo": m["pbo"], "accuracy": m["directional_accuracy"],
                "beta": m["beta_to_btc"], "alpha_ann": m["alpha_ann"], "alpha_t": m["alpha_t"],
                "recent_24m_sharpe": m["recent_24m_sharpe"], "trials": m["n_trials"],
                "verdict": verdict(m),
            })
    tbl = pd.DataFrame(rows).sort_values("sharpe", ascending=False)

    emit("### Results\n")
    emit("| Strategy | Venue | Sharpe | 95% CI | Beta | Alpha (t) | DSR | PBO | 24m Sharpe | Verdict |")
    emit("|---|---|---|---|---|---|---|---|---|---|")
    for _, x in tbl.iterrows():
        pbo = "n/a" if np.isnan(x.pbo) else f"{x.pbo:.2f}"
        emit(f"| {x.strategy} | {x.venue} | {x.sharpe:.2f} | [{x.ci_lo:.2f}, {x.ci_hi:.2f}] | "
             f"{x.beta:.2f} | {x.alpha_ann:+.1%} ({x.alpha_t:+.2f}) | {x.dsr:.3f} | {pbo} | "
             f"{x.recent_24m_sharpe:+.2f} | {x.verdict} |")
    emit()
    emit("**Read the alpha column, not the Sharpe column.** A high Sharpe with beta near "
         "1 and a t-statistic below 2 is the underlying asset, not a strategy.\n")
    return tbl, abl_sharpe


def sensitivity(df: pd.DataFrame, abl_sharpe: float) -> None:
    """A metric that moves with arbitrary settings is not a point estimate."""
    emit("## 3. Sensitivity — does the result survive its own settings?\n")
    emit("| Sample start | test_days=60 | test_days=90 | test_days=180 |")
    emit("|---|---|---|---|")
    for start in ("2013-04-01", "2015-01-01", "2016-01-01"):
        sub = df[df.index >= start]
        cells = []
        for td in (60, 90, 180):
            cfg = WalkForwardConfig(test_days=td)
            m = walk_forward(sub, REGISTRY["trend_risk_managed"], VENUES["cex_taker"],
                             cfg, ablation_sharpe=abl_sharpe).metrics
            cells.append(f"{m['oos_sharpe']:.2f}" if m else "n/a")
        emit(f"| {start} | " + " | ".join(cells) + " |")
    emit("\nIf these cells disagree, the headline number is a choice, not a measurement.\n")


def regime_check(df: pd.DataFrame, abl_sharpe: float) -> None:
    """The question that decides everything: does the edge still exist?"""
    emit("## 4. Regime check — is the edge still alive?\n")
    res = walk_forward(df, REGISTRY["trend_risk_managed"], VENUES["cex_taker"],
                       ablation_sharpe=abl_sharpe)
    oos = res.oos_returns
    bench = buy_and_hold_returns(df, oos.index)
    emit("| Year | Strategy Sharpe | Strategy return | BTC return |")
    emit("|---|---|---|---|")
    for yr, grp in oos.groupby(oos.index.year):
        s = grp.mean() / grp.std() * np.sqrt(365) if grp.std() > 0 else float("nan")
        b = bench.reindex(grp.index).dropna()
        emit(f"| {yr} | {s:.2f} | {(1+grp).prod()-1:+.1%} | {(1+b).prod()-1:+.1%} |")
    m = res.metrics
    emit(f"\n**Last 24 months: Sharpe {m['recent_24m_sharpe']:.2f}, "
         f"return {m['recent_24m_return']:+.1%}.**\n")
    emit(f"Beta to BTC {m['beta_to_btc']:.2f}, annualised alpha {m['alpha_ann']:+.1%} "
         f"with Newey-West t = {m['alpha_t']:+.2f}. "
         f"A t-statistic below 2 means the alpha is indistinguishable from zero.\n")


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
    tbl, abl_sharpe = evaluate_strategies(df, args.quick)
    sensitivity(df, abl_sharpe)
    regime_check(df, abl_sharpe)

    emit("## 5. Gate outcome\n")
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
