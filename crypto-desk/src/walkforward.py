"""Purged, embargoed walk-forward evaluation and the funding gate.

Parameters are chosen only on data preceding the block they are tested on, with a
gap between the two. The number of configurations examined is counted and fed to
the deflated Sharpe ratio, because that count is what turns a search into
evidence -- or exposes it as noise-mining.

This module was substantially rewritten after an adversarial review found four
independent flaws in its first version, any one of which was disqualifying:

  1. the gate measured everything against zero, so it certified beta as alpha --
     a strategy with the forecast deleted scored higher and passed;
  2. the trial count was understated by roughly twenty-fold;
  3. the overfitting statistic was computed on full-sample returns, which do not
     describe the walk-forward at all;
  4. the expanding window meant every fold chose the same parameters, so the
     "walk-forward" could not respond to regime change.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .backtest import directional_accuracy, run_backtest
from .benchmark import buy_and_hold_returns, newey_west_alpha
from .costs import Venue
from .stats import (
    deflated_sharpe_ratio,
    probabilistic_sharpe_ratio,
    probability_of_backtest_overfitting,
    sharpe,
    stationary_bootstrap_ci,
)
from .strategies import Strategy

# Every configuration this project has evaluated is part of the search that
# produced any result it reports -- across strategies, venues, walk-forward
# settings, and the design iterations that chose the grids in the first place.
# The registry alone holds 80; the honest count including researcher degrees of
# freedom is several hundred. Understating it is how a backtest flatters itself.
PROJECT_SEARCH_BUDGET = 500

# The maximum drawdown this account can tolerate. Used by BOTH the selection step
# and the funding gate. Keeping them as one constant closes an inconsistency
# found by the gate-power test: selecting variants purely on Sharpe picked the
# highest-volatility configuration available, which the gate then rejected on
# drawdown. A platform must not select for what it goes on to punish.
MAX_DRAWDOWN_MANDATE = -0.50


@dataclass
class WalkForwardConfig:
    min_train_days: int = 730
    test_days: int = 90
    embargo_days: int = 5
    # Rolling by default. An expanding window eventually buries recent data under
    # a decade of history, so the same parameters win every fold and the
    # procedure cannot adapt to a regime change -- a fixed-parameter backtest
    # wearing walk-forward clothing.
    expanding: bool = False
    rolling_train_days: int = 1095


@dataclass
class WalkForwardResult:
    strategy: str
    venue: str
    oos_returns: pd.Series
    oos_positions: pd.Series
    folds: pd.DataFrame
    n_trials: int
    oos_variant_returns: pd.DataFrame
    metrics: dict = field(default_factory=dict)


def _score(returns: pd.Series) -> float:
    s = sharpe(returns)
    return -np.inf if np.isnan(s) else s


def _selection_score(result) -> float:
    """Training score used to choose a variant.

    Sharpe, but a variant that already breaches the drawdown mandate in training
    is not eligible: it is disqualified before it can win. If nothing qualifies,
    the least-bad option is still ranked so a fold always makes a choice.
    """
    s = _score(result.net_returns)
    dd = result.metrics.get("max_drawdown", 0.0)
    if dd is not None and not np.isnan(dd) and dd < MAX_DRAWDOWN_MANDATE:
        return -np.inf if np.isinf(s) else s - 100.0
    return s


def walk_forward(df: pd.DataFrame, strategy: Strategy, venue: Venue,
                 cfg: WalkForwardConfig | None = None,
                 starting_equity: float = 1000.0,
                 trials_searched: int | None = None,
                 ablation_returns: pd.Series | None = None) -> WalkForwardResult:
    """Run the walk-forward and score it.

    `trials_searched` is the honest size of the search that produced this result.
    It defaults to PROJECT_SEARCH_BUDGET rather than to this strategy's own grid,
    because a result is selected from everything that was tried, not from the
    last grid that happened to be running.
    """
    cfg = cfg or WalkForwardConfig()
    param_sets = strategy.param_sets()

    # Positions are causal, so they can be computed once over the full sample and
    # sliced. This also avoids the warm-up discontinuity that appears when each
    # fold recomputes indicators from a truncated history.
    variants = {
        (",".join(f"{k}={v}" for k, v in p.items()) or "default"): strategy.positions(df, **p)
        for p in param_sets
    }

    dates = df.index
    start_i = cfg.min_train_days
    fold_rows, oos_chunks, oos_pos_chunks = [], [], []
    variant_oos: dict[str, list[pd.Series]] = {k: [] for k in variants}

    while start_i + cfg.embargo_days + cfg.test_days <= len(dates):
        train_lo = 0 if cfg.expanding else max(0, start_i - cfg.rolling_train_days)
        train_slice = dates[train_lo:start_i]
        test_lo = start_i + cfg.embargo_days
        test_slice = dates[test_lo:test_lo + cfg.test_days]

        best_key, best_score = None, -np.inf
        for key, pos in variants.items():
            tr = run_backtest(df.loc[train_slice], pos.loc[train_slice], venue, starting_equity)
            s = _selection_score(tr)
            if s > best_score:
                best_key, best_score = key, s

            # Every variant's out-of-sample return on this block, so the
            # overfitting statistic describes the walk-forward that actually ran.
            te_v = run_backtest(df.loc[test_slice], pos.loc[test_slice], venue, starting_equity)
            variant_oos[key].append(te_v.net_returns)

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
    var_oos = pd.DataFrame({k: pd.concat(v) for k, v in variant_oos.items() if v})

    n_trials = trials_searched if trials_searched is not None else PROJECT_SEARCH_BUDGET
    res = WalkForwardResult(strategy.name, venue.name, oos, oos_pos, folds, n_trials, var_oos)
    if len(oos) > 30:
        res.metrics = _score_result(df, res, starting_equity, ablation_returns)
    return res


def pool_trial_variance(results: list[WalkForwardResult]) -> float:
    """Cross-sectional variance of per-period Sharpes across EVERY configuration.

    The deflated Sharpe ratio needs the variance of the trial Sharpes over the
    search that produced the result. Measuring it within one strategy's handful
    of near-identical variants gives a variance roughly ten times too small --
    correlated trials cluster, so their observed spread is narrow, so the
    expected-maximum bar comes out low. That makes the gate MORE lenient, which
    is the opposite of what deflation is for.

    Pooling across all strategies is not perfect either, but it at least
    describes the same search that `PROJECT_SEARCH_BUDGET` counts.
    """
    sharpes = []
    for r in results:
        m = r.oos_variant_returns
        if m is None or m.empty:
            continue
        sharpes.extend(
            m.apply(lambda c: c.mean() / c.std() if c.std() > 0 else np.nan).dropna().tolist()
        )
    return float(np.var(sharpes)) if len(sharpes) > 2 else float("nan")


def apply_pooled_variance(res: WalkForwardResult, pooled_var: float) -> None:
    """Re-deflate an already-scored result using the project-wide trial variance."""
    if not res.metrics or np.isnan(pooled_var):
        return
    dsr = deflated_sharpe_ratio(res.oos_returns, res.n_trials, trial_sr_variance=pooled_var)
    res.metrics["dsr"] = dsr["dsr"]
    res.metrics["expected_max_sharpe_from_search"] = dsr["expected_max_sharpe_ann"]
    res.metrics["trial_sr_variance"] = pooled_var


def _score_result(df: pd.DataFrame, res: WalkForwardResult, starting_equity: float,
                  ablation_returns: pd.Series | None) -> dict:
    oos, folds = res.oos_returns, res.folds
    eq = starting_equity * (1 + oos).cumprod()
    years = max((oos.index[-1] - oos.index[0]).days, 1) / 365

    # Deflate against the theoretical null by default. The project-wide pooled
    # variance is applied afterwards by `apply_pooled_variance`; using this
    # strategy's own variants here would understate the bar roughly ten-fold.
    dsr = deflated_sharpe_ratio(oos, res.n_trials)
    lo, hi = stationary_bootstrap_ci(oos, n_boot=600)

    # Alpha over the underlying, on exactly the days the strategy traded.
    bench = buy_and_hold_returns(df, oos.index)
    reg = newey_west_alpha(oos, bench)

    recent = oos[oos.index > oos.index.max() - pd.Timedelta(days=730)]
    recent_sharpe = sharpe(recent) if len(recent) > 60 else float("nan")

    # Spanning test: does the strategy add anything the forecast-free control
    # does not already provide? Comparing raw Sharpes instead would reject a
    # genuinely good low-beta strategy simply for being smaller than a levered
    # long in a bull market.
    if ablation_returns is not None and len(ablation_returns) > 60:
        span = newey_west_alpha(oos, ablation_returns.reindex(oos.index))
        span_alpha, span_t = span["alpha_ann"], span["alpha_t"]
    else:
        span_alpha = span_t = np.nan

    # PBO within structurally comparable variants only. Mixing long-only and
    # long/short variants makes CSCV detect a persistent beta ranking and score
    # it as "selection works".
    cols = list(res.oos_variant_returns.columns)
    lo_cols = [c for c in cols if "long_only=True" in c]
    pbo_input = res.oos_variant_returns[lo_cols] if len(lo_cols) > 2 else res.oos_variant_returns

    return {
        "oos_days": len(oos), "oos_years": round(years, 2),
        "oos_total_return": float(eq.iloc[-1] / starting_equity - 1),
        "oos_cagr": float((eq.iloc[-1] / starting_equity) ** (1 / years) - 1)
                    if eq.iloc[-1] > 0 else -1.0,
        "oos_sharpe": sharpe(oos),
        "sharpe_ci_lo": lo, "sharpe_ci_hi": hi,
        "oos_max_dd": float((eq / eq.cummax() - 1).min()),
        "psr_vs_zero": probabilistic_sharpe_ratio(oos),
        "dsr": dsr["dsr"],
        "expected_max_sharpe_from_search": dsr["expected_max_sharpe_ann"],
        "n_trials": res.n_trials,
        "pbo": probability_of_backtest_overfitting(pbo_input),
        "directional_accuracy": directional_accuracy(res.oos_positions, df),
        "beta_to_btc": reg["beta"],
        "alpha_ann": reg["alpha_ann"],
        "alpha_t": reg["alpha_t"],
        "benchmark_sharpe": sharpe(bench),
        "alpha_vs_ablation": span_alpha,
        "alpha_t_vs_ablation": span_t,
        "tracking_error_ann": reg.get("tracking_error_ann", np.nan),
        "recent_24m_sharpe": recent_sharpe,
        "recent_24m_return": float((1 + recent).prod() - 1) if len(recent) else np.nan,
        "param_stability": float(folds["chosen"].nunique()) if len(folds) else np.nan,
        "n_folds": len(folds),
        "final_equity": float(eq.iloc[-1]),
    }


def verdict(m: dict) -> str:
    """The gate. A strategy is fundable only if every clause holds."""
    if not m:
        return "NO RESULT"

    def ok(v, test):
        return v is not None and not (isinstance(v, float) and np.isnan(v)) and test(v)

    checks = {
        "positive OOS Sharpe": m.get("oos_sharpe", -9) > 0,
        "Sharpe CI excludes 0": m.get("sharpe_ci_lo", -9) > 0,
        "DSR > 0.95": m.get("dsr", 0) > 0.95,
        "PBO < 0.5": (m.get("n_trials", 1) <= 1
                      or ok(m.get("pbo"), lambda v: v < 0.5)),
        "drawdown within mandate": m.get("oos_max_dd", -1) > MAX_DRAWDOWN_MANDATE,
        # It must be alpha, not beta wearing a signal's clothes.
        "alpha t > 2.5 vs buy-and-hold": ok(m.get("alpha_t"), lambda v: v > 2.5),
        # And it must add something the forecast-free control does not already
        # provide. This is a spanning test, not a Sharpe comparison: a low-beta
        # strategy with real alpha should not be rejected merely for being
        # smaller than a levered long in a bull market.
        "alpha t > 2.0 vs no-signal control": (
            np.isnan(m.get("alpha_t_vs_ablation", np.nan))
            or m["alpha_t_vs_ablation"] > 2.0),
    }
    failed = [k for k, v in checks.items() if not v]
    return "FUNDABLE" if not failed else "REJECT: " + "; ".join(failed)


def flags(m: dict) -> list[str]:
    """Non-blocking warnings: real concerns that are too noisy to gate on.

    A two-year Sharpe has a standard error near 0.7, so gating on it hard would
    discard a genuinely good strategy roughly a third of the time -- and would
    fire against any trend strategy in a chop regime, which is exactly when the
    literature expects trend to underperform. Reported loudly, gated softly.
    """
    out = []
    r24 = m.get("recent_24m_sharpe", np.nan)
    if not np.isnan(r24) and r24 < 0.3:
        out.append(f"edge weak in last 24m (Sharpe {r24:.2f})")
    te = m.get("tracking_error_ann", np.nan)
    if not np.isnan(te) and te < 0.05:
        out.append(f"tracks the benchmark closely (TE {te:.1%})")
    ps = m.get("param_stability", np.nan)
    if not np.isnan(ps) and ps <= 1:
        out.append("every fold chose identical parameters (window may be too long)")
    return out
