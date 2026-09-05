"""Statistics for telling a real edge from a well-dressed accident.

A Sharpe ratio from a search over many strategies is not a Sharpe ratio, it is
the maximum of a sample of noise. Everything here exists to price that in.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from itertools import combinations
from math import comb

EULER_MASCHERONI = 0.5772156649015329


def _norm_cdf(x: float) -> float:
    from math import erf, sqrt
    return 0.5 * (1.0 + erf(x / sqrt(2.0)))


def _norm_ppf(p: float) -> float:
    """Acklam's rational approximation to the normal quantile function."""
    if not 0.0 < p < 1.0:
        return float("nan")
    a = [-3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
         1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00]
    b = [-5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
         6.680131188771972e01, -1.328068155288572e01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
         -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00,
         3.754408661907416e00]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = np.sqrt(-2 * np.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p > phigh:
        q = np.sqrt(-2 * np.log(1 - p))
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    q = p - 0.5
    r = q * q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)


def sharpe(returns: pd.Series, periods: int = 365) -> float:
    r = returns.dropna()
    if len(r) < 2 or r.std() == 0:
        return float("nan")
    return float(r.mean() / r.std() * np.sqrt(periods))


def probabilistic_sharpe_ratio(returns: pd.Series, benchmark_sr: float = 0.0,
                               periods: int = 365) -> float:
    """P(true Sharpe > benchmark), correcting for skew, kurtosis and sample size."""
    r = returns.dropna()
    n = len(r)
    if n < 3 or r.std() == 0:
        return float("nan")
    sr = r.mean() / r.std()                    # per-period
    bench = benchmark_sr / np.sqrt(periods)
    skew = float(((r - r.mean()) ** 3).mean() / r.std() ** 3)
    kurt = float(((r - r.mean()) ** 4).mean() / r.std() ** 4)
    denom = np.sqrt(max(1 - skew * sr + (kurt - 1) / 4 * sr ** 2, 1e-12))
    return _norm_cdf((sr - bench) * np.sqrt(n - 1) / denom)


def deflated_sharpe_ratio(returns: pd.Series, n_trials: int,
                          trial_sr_variance: float | None = None,
                          periods: int = 365) -> dict[str, float]:
    """Bailey & Lopez de Prado's DSR.

    Answers the question the '2,000 to 5,000 simulations' plan never asks: given
    that I searched N times, how good would the best result look if I had no
    skill at all? `expected_max_sharpe` is that bar. DSR is the probability the
    strategy clears it.
    """
    r = returns.dropna()
    n = len(r)
    if n < 3 or r.std() == 0 or n_trials < 1:
        return {"dsr": float("nan"), "expected_max_sharpe_ann": float("nan")}
    sr = r.mean() / r.std()
    if trial_sr_variance is None:
        # Under the null of no skill the per-period Sharpe estimate has variance
        # approximately 1/n across independent trials.
        trial_sr_variance = 1.0 / n
    sd = np.sqrt(trial_sr_variance)
    N = max(n_trials, 2)
    sr0 = sd * (
        (1 - EULER_MASCHERONI) * _norm_ppf(1 - 1.0 / N)
        + EULER_MASCHERONI * _norm_ppf(1 - 1.0 / (N * np.e))
    )
    skew = float(((r - r.mean()) ** 3).mean() / r.std() ** 3)
    kurt = float(((r - r.mean()) ** 4).mean() / r.std() ** 4)
    denom = np.sqrt(max(1 - skew * sr + (kurt - 1) / 4 * sr ** 2, 1e-12))
    return {
        "dsr": _norm_cdf((sr - sr0) * np.sqrt(n - 1) / denom),
        "expected_max_sharpe_ann": float(sr0 * np.sqrt(periods)),
        "observed_sharpe_ann": float(sr * np.sqrt(periods)),
        "n_trials": float(n_trials),
    }


def stationary_bootstrap_ci(returns: pd.Series, n_boot: int = 2000,
                            mean_block: int = 21, alpha: float = 0.05,
                            periods: int = 365, seed: int = 0) -> tuple[float, float]:
    """Confidence interval for the Sharpe ratio that respects serial dependence."""
    r = returns.dropna().values
    n = len(r)
    if n < 30:
        return (float("nan"), float("nan"))
    rng = np.random.default_rng(seed)
    p = 1.0 / mean_block
    out = np.empty(n_boot)
    for b in range(n_boot):
        idx = np.empty(n, dtype=int)
        i = rng.integers(0, n)
        for t in range(n):
            idx[t] = i
            i = rng.integers(0, n) if rng.random() < p else (i + 1) % n
        s = r[idx]
        out[b] = s.mean() / s.std() * np.sqrt(periods) if s.std() > 0 else np.nan
    lo, hi = np.nanpercentile(out, [100 * alpha / 2, 100 * (1 - alpha / 2)])
    return float(lo), float(hi)


def probability_of_backtest_overfitting(returns_matrix: pd.DataFrame,
                                        n_splits: int = 8) -> float:
    """CSCV estimate of PBO (Bailey et al.).

    Columns are strategy variants, rows are aligned returns. Splits the sample
    into blocks, picks the in-sample winner over every half-and-half partition,
    and measures how often that winner lands in the bottom half out-of-sample.
    PBO above ~0.5 means the selection procedure is worse than picking at random.
    """
    m = returns_matrix.dropna(how="any")
    if m.shape[1] < 2 or m.shape[0] < n_splits * 4:
        return float("nan")
    if n_splits % 2:
        n_splits += 1
    blocks = np.array_split(np.arange(len(m)), n_splits)
    below = total = 0
    for is_blocks in combinations(range(n_splits), n_splits // 2):
        oos_blocks = [b for b in range(n_splits) if b not in is_blocks]
        is_idx = np.concatenate([blocks[b] for b in is_blocks])
        oos_idx = np.concatenate([blocks[b] for b in oos_blocks])
        is_sr = m.iloc[is_idx].apply(lambda c: c.mean() / c.std() if c.std() > 0 else -np.inf)
        oos_sr = m.iloc[oos_idx].apply(lambda c: c.mean() / c.std() if c.std() > 0 else -np.inf)
        best = is_sr.idxmax()
        rank = oos_sr.rank(pct=True)[best]
        below += int(rank < 0.5)
        total += 1
    return below / total if total else float("nan")


def max_drawdown(equity: pd.Series) -> float:
    return float((equity / equity.cummax() - 1.0).min())
