"""Leak-free feature construction.

Every feature here is a function of information available at or before the close
of day t. `assert_no_lookahead` in tests/ verifies this by truncating the input
and checking that historical feature values do not change.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def _safe_div(a: pd.Series, b: pd.Series) -> pd.Series:
    return a / b.replace(0.0, np.nan)


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a frame of causal features indexed identically to `df`."""
    close, high, low, vol = df["close"], df["high"], df["low"], df["volume"]
    r = close.pct_change()
    out = pd.DataFrame(index=df.index)

    # Momentum across horizons -- the only crypto anomaly with a serious
    # out-of-sample literature behind it.
    for n in (1, 3, 5, 10, 21, 63, 126):
        out[f"mom_{n}"] = close.pct_change(n)

    # Volatility state.
    for n in (10, 21, 63):
        out[f"vol_{n}"] = r.rolling(n).std()
    out["vol_ratio"] = _safe_div(out["vol_10"], out["vol_63"])

    # Trend position, expressed scale-free.
    for n in (20, 50, 200):
        out[f"px_vs_sma_{n}"] = _safe_div(close, close.rolling(n).mean()) - 1.0
    out["sma_50_200"] = _safe_div(close.rolling(50).mean(), close.rolling(200).mean()) - 1.0

    # Range position: where in the recent channel are we.
    for n in (20, 55):
        hi, lo = high.rolling(n).max(), low.rolling(n).min()
        out[f"donchian_pos_{n}"] = _safe_div(close - lo, hi - lo)

    # Normalised true range.
    tr = pd.concat(
        [high - low, (high - close.shift()).abs(), (low - close.shift()).abs()], axis=1
    ).max(axis=1)
    out["atr_pct_14"] = _safe_div(tr.rolling(14).mean(), close)

    # Volume pressure.
    out["vol_z_21"] = _safe_div(vol - vol.rolling(21).mean(), vol.rolling(21).std())

    # Mean-reversion / stretch.
    out["rsi_14"] = _rsi(close, 14)
    out["ret_z_21"] = _safe_div(r - r.rolling(21).mean(), r.rolling(21).std())

    return out.replace([np.inf, -np.inf], np.nan)


def _rsi(close: pd.Series, n: int) -> pd.Series:
    d = close.diff()
    gain = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    loss = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + _safe_div(gain, loss))
