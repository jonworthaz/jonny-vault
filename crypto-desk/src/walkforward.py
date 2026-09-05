"""Purged, embargoed walk-forward evaluation.

Parameters are chosen only on data that precedes the block they are tested on,
with a gap between the two so that overlapping-horizon leakage cannot help. The
number of configurations examined is counted and returned, because that count is
the input the deflated Sharpe ratio needs and the number every over-fitted
backtest quietly omits.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .backtest import run_backtest, directional_accuracy
from .costs import Venue
from .stats import (
    deflated_sharpe_ratio,
    probabilistic_sharpe_ratio,
    probability_of_backtest_overfitting,
    sharpe,
    stationary_bootstrap_ci,
)
from .strategies import Strategy


@dataclass
class WalkForwardConfig:
    min_train_days: int = 730
    test_days: int = 90
    embargo_days: int = 5
    expanding: bool = True
    rolling_train_days: int = 1095


@dataclass
class WalkForwardResult:
    strategy: str
    venue: str
    oos_returns: pd.Series
    oos_positions: pd.Series
    folds: pd.DataFrame
    n_trials: int
    variant_returns: pd.DataFrame
    metrics: dict = field(default_factory=dict)


def _score(returns: pd.Series) -> float:
    s = sharpe(returns)
    return -np.inf if np.isnan(s) else s


def walk_forward(df: pd.DataFrame, strategy: Strategy, venue: Venue,
                 cfg: WalkForwardConfig | None = None,
                 starting_equity: float = 1000.0) -> WalkForwardResult:
    cfg = cfg or WalkForwardConfig()
    param_sets = strategy.param_sets()

    # Positions are causal, so they can be computed once over the full sample and
    # then sliced. This also removes the warm-up discontinuity that appears when
    # each fold recomputes indicators from a truncated history.
    variants: dict[str, pd.Series] = {}
    for p in param_sets:
        key = ",".join(f"{k}={v}" for k, v in p.items()) or "default"
        variants[key] = strategy.positions(df, **p)

    dates = df.index
    start_i = cfg.min_train_days
    fold_rows, oos_chunks, oos_pos_chunks = [], [], []

    while start_i + cfg.embargo_days + cfg.test_days <= len(dates):
        train_lo = 0 if cfg.expanding else max(0, start_i - cfg.rolling_train_days)
        train_slice = dates[train_lo:start_i]
        test_lo = start_i + cfg.embargo_days
        test_slice = dates[test_lo:test_lo + cfg.test_days]

        best_key, best_score = None, -np.inf
        for key, pos in variants.items():
            tr = run_backtest(df.loc[train_slice], pos.loc[train_slice], venue, starting_equity)
            s = _score(tr.net_returns)
            if s > best_score:
                best_key, best_score = key, s

        te = run_backtest(df.loc[test_slice], variants[best_key].loc[test_slice],
                          venue, starting_equity)
        oos_chunks.append(te.net_returns)
        oos_pos_chunks.append(te.positions)
        fold_rows.append({
            "train_start": train_slice[0].date(), "train_end": train_slice[-1].date(),
            "test_start": test_slice[0].date(), "test_end": test_slice[-1].date(),
            "chosen": best_key, "is_sharpe": best_score,
            "oos_sharpe": _score(te.net_returns),
            "oos_return": float((1 + te.net_returns).prod() - 1),
        })
        start_i += cfg.test_days

    oos = pd.concat(oos_chunks) if oos_chunks else pd.Series(dtype=float)
    oos_pos = pd.concat(oos_pos_chunks) if oos_pos_chunks else pd.Series(dtype=float)
    folds = pd.DataFrame(fold_rows)

    # Full-sample returns per variant, for the overfitting diagnostic.
    var_rets = pd.DataFrame({
        k: run_backtest(df, v, venue, starting_equity).net_returns for k, v in variants.items()
    })

    n_trials = max(len(param_sets), 1)
    res = WalkForwardResult(strategy.name, venue.name, oos, oos_pos, folds,
                            n_trials, var_rets)

    if len(oos) > 30:
        eq = starting_equity * (1 + oos).cumprod()
        years = len(oos) / 365
        lo, hi = stationary_bootstrap_ci(oos, n_boot=600)
        dsr = deflated_sharpe_ratio(oos, n_trials)
        # A strategy whose edge lives entirely in old regimes is a history
        # lesson, not a trading system. This is the number that matters most.
        recent = oos[oos.index > oos.index.max() - pd.Timedelta(days=730)]
        recent_sharpe = sharpe(recent) if len(recent) > 60 else float("nan")
        res.metrics = {
            "oos_days": len(oos),
            "oos_years": round(years, 2),
            "oos_total_return": float(eq.iloc[-1] / starting_equity - 1),
            "oos_cagr": float((eq.iloc[-1] / starting_equity) ** (1 / years) - 1),
            "oos_sharpe": sharpe(oos),
            "sharpe_ci_lo": lo, "sharpe_ci_hi": hi,
            "oos_max_dd": float((eq / eq.cummax() - 1).min()),
            "psr_vs_zero": probabilistic_sharpe_ratio(oos),
            "dsr": dsr["dsr"],
            "expected_max_sharpe_from_search": dsr["expected_max_sharpe_ann"],
            "n_trials": n_trials,
            "pbo": probability_of_backtest_overfitting(var_rets),
            "directional_accuracy": directional_accuracy(oos_pos, df),
            "param_stability": float(folds["chosen"].nunique()) if len(folds) else np.nan,
            "n_folds": len(folds),
            "final_equity": float(eq.iloc[-1]),
            "recent_24m_sharpe": recent_sharpe,
            "recent_24m_return": float((1 + recent).prod() - 1) if len(recent) else np.nan,
        }
    return res


def verdict(m: dict) -> str:
    """The gate. A strategy is only fundable if it survives every clause."""
    if not m:
        return "NO RESULT"
    checks = {
        "positive OOS Sharpe": m.get("oos_sharpe", -9) > 0,
        "Sharpe CI excludes 0": m.get("sharpe_ci_lo", -9) > 0,
        "DSR > 0.95": m.get("dsr", 0) > 0.95,
        # A single-variant strategy involves no selection, so PBO is undefined
        # rather than failing -- there was nothing to overfit to.
        "PBO < 0.5": (m.get("n_trials", 1) <= 1
                      or (not np.isnan(m.get("pbo", np.nan)) and m["pbo"] < 0.5)),
        "drawdown > -50%": m.get("oos_max_dd", -1) > -0.50,
        # PRD phase-2 gate: the edge must still be present, not merely historical.
        "edge alive in last 24m": (not np.isnan(m.get("recent_24m_sharpe", np.nan))
                                   and m["recent_24m_sharpe"] > 0.3),
    }
    failed = [k for k, ok in checks.items() if not ok]
    return "FUNDABLE" if not failed else "REJECT: " + "; ".join(failed)
