"""Benchmark-relative evaluation.

An adversarial review of this project's first result found that a strategy
containing no forecast at all -- constant long exposure, volatility targeted --
scored a HIGHER Sharpe than the "winning" momentum strategy and passed the gate
cleanly. The gate measured everything against zero, so it certified beta as
alpha.

Nothing is fundable here unless it beats (a) its own beta to the underlying and
(b) the same machinery with the signal deleted.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .data import forward_open_to_open_returns

# Annualised tracking error below which an alpha t-statistic is not meaningful.
MIN_TRACKING_ERROR = 0.01


def newey_west_alpha(strategy: pd.Series, benchmark: pd.Series,
                     lags: int = 10, periods: int = 365) -> dict[str, float]:
    """Regress strategy on benchmark; return annualised alpha and a HAC t-stat.

    Crypto returns are heteroskedastic and serially dependent, so ordinary OLS
    standard errors overstate significance. Newey-West with `lags` is the minimum
    honest correction.
    """
    df = pd.concat([strategy.rename("y"), benchmark.rename("x")], axis=1).dropna()
    if len(df) < 60:
        return {"alpha_ann": np.nan, "beta": np.nan, "alpha_t": np.nan,
                "n": len(df), "tracking_error_ann": np.nan}

    y = df["y"].values
    X = np.column_stack([np.ones(len(df)), df["x"].values])
    xtx_inv = np.linalg.pinv(X.T @ X)
    coef = xtx_inv @ X.T @ y
    resid = y - X @ coef

    # Newey-West HAC covariance.
    n = len(y)
    S = (X * resid[:, None]).T @ (X * resid[:, None])
    for L in range(1, min(lags, n - 1) + 1):
        w = 1.0 - L / (lags + 1.0)
        u_t = (X * resid[:, None])[L:]
        u_tl = (X * resid[:, None])[:-L]
        G = u_t.T @ u_tl
        S += w * (G + G.T)
    cov = xtx_inv @ S @ xtx_inv
    se_alpha = float(np.sqrt(max(cov[0, 0], 1e-300)))

    # A strategy that tracks the benchmark almost exactly has a near-noiseless
    # residual, which makes the t-statistic explode on an economically
    # meaningless difference -- buy-and-hold regressed on itself scores t = -7.7,
    # and a small positive cost advantage would score an equally large +7.7.
    # Below a floor of tracking error the t-statistic is not meaningful.
    tracking_error_ann = float(resid.std() * np.sqrt(periods))
    if tracking_error_ann < MIN_TRACKING_ERROR:
        return {"alpha_ann": float(coef[0] * periods), "beta": float(coef[1]),
                "alpha_t": np.nan, "n": n, "tracking_error_ann": tracking_error_ann}

    return {
        "tracking_error_ann": tracking_error_ann,
        "alpha_ann": float(coef[0] * periods),
        "beta": float(coef[1]),
        "alpha_t": float(coef[0] / se_alpha) if se_alpha > 0 else np.nan,
        "n": n,
    }


def buy_and_hold_returns(df: pd.DataFrame, on: pd.Index) -> pd.Series:
    """The underlying's return on exactly the days the strategy was evaluated."""
    return forward_open_to_open_returns(df).reindex(on)
