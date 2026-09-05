"""Candidate strategies.

Each strategy maps an OHLCV frame to a position series indexed by the SIGNAL date
(the close of day t), using only data up to and including that close. The
backtester handles the one-bar execution delay, so strategies must not shift for
it themselves -- doing so would double-count the lag.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable

import numpy as np
import pandas as pd

Positions = pd.Series
StrategyFn = Callable[..., Positions]


@dataclass(frozen=True)
class Strategy:
    name: str
    fn: StrategyFn
    grid: dict[str, Iterable] | None = None

    def param_sets(self) -> list[dict]:
        if not self.grid:
            return [{}]
        keys = list(self.grid)
        out, stack = [], [{}]
        for k in keys:
            stack = [{**d, k: v} for d in stack for v in self.grid[k]]
        return stack

    def positions(self, df: pd.DataFrame, **params) -> Positions:
        return self.fn(df, **params).reindex(df.index).fillna(0.0)


# --- baselines -------------------------------------------------------------

def buy_and_hold(df: pd.DataFrame) -> Positions:
    """The benchmark every active strategy must beat net of costs and tax."""
    return pd.Series(1.0, index=df.index)


def random_signal(df: pd.DataFrame, seed: int = 0) -> Positions:
    rng = np.random.default_rng(seed)
    return pd.Series(rng.choice([-1.0, 1.0], len(df)), index=df.index)


# --- trend / momentum ------------------------------------------------------

def sma_cross(df: pd.DataFrame, fast: int = 50, slow: int = 200,
              long_only: bool = False) -> Positions:
    c = df["close"]
    sig = np.sign(c.rolling(fast).mean() - c.rolling(slow).mean())
    sig = sig.fillna(0.0)
    return sig.clip(lower=0.0) if long_only else sig


def donchian_breakout(df: pd.DataFrame, entry: int = 55, exit_: int = 20) -> Positions:
    """Classic turtle-style channel breakout, stateful and causal."""
    hi_e = df["high"].rolling(entry).max().shift(1)
    lo_e = df["low"].rolling(entry).min().shift(1)
    hi_x = df["high"].rolling(exit_).max().shift(1)
    lo_x = df["low"].rolling(exit_).min().shift(1)
    c = df["close"]
    pos = np.zeros(len(df))
    state = 0.0
    for i in range(len(df)):
        px = c.iloc[i]
        if state == 0.0:
            if not np.isnan(hi_e.iloc[i]) and px > hi_e.iloc[i]:
                state = 1.0
            elif not np.isnan(lo_e.iloc[i]) and px < lo_e.iloc[i]:
                state = -1.0
        elif state > 0 and not np.isnan(lo_x.iloc[i]) and px < lo_x.iloc[i]:
            state = 0.0
        elif state < 0 and not np.isnan(hi_x.iloc[i]) and px > hi_x.iloc[i]:
            state = 0.0
        pos[i] = state
    return pd.Series(pos, index=df.index)


def time_series_momentum(df: pd.DataFrame, lookback: int = 90,
                         long_only: bool = False) -> Positions:
    sig = np.sign(df["close"].pct_change(lookback)).fillna(0.0)
    return sig.clip(lower=0.0) if long_only else sig


def mean_reversion(df: pd.DataFrame, lookback: int = 5, z: float = 1.0) -> Positions:
    r = df["close"].pct_change()
    zs = (r.rolling(lookback).sum() - r.rolling(lookback).sum().rolling(63).mean()) / \
         r.rolling(lookback).sum().rolling(63).std()
    return (-np.sign(zs) * (zs.abs() > z)).fillna(0.0)


# --- overlays --------------------------------------------------------------

def volatility_target(positions: Positions, df: pd.DataFrame,
                      target_ann_vol: float = 0.40, lookback: int = 30,
                      max_leverage: float = 1.0) -> Positions:
    """Scale exposure so realised risk stays near target.

    This is the single highest-value overlay for a small account: it is what
    stops one 20% BTC day from ending the experiment.
    """
    rv = df["close"].pct_change().rolling(lookback).std() * np.sqrt(365)
    scale = (target_ann_vol / rv).clip(upper=max_leverage).fillna(0.0)
    return (positions * scale).clip(-max_leverage, max_leverage)


def apply_trade_buffer(positions: Positions, buffer: float = 0.15) -> Positions:
    """Suppress position changes smaller than `buffer`.

    Turnover is the tax on continuous signals. Not rebalancing for noise is
    frequently worth more than any signal improvement.
    """
    out = positions.copy().astype(float)
    last = 0.0
    for i, v in enumerate(out.values):
        if abs(v - last) < buffer:
            out.iloc[i] = last
        else:
            last = float(out.iloc[i])
    return out


REGISTRY: dict[str, Strategy] = {
    "buy_and_hold": Strategy("buy_and_hold", buy_and_hold),
    "random": Strategy("random", random_signal, {"seed": range(0, 5)}),
    "sma_cross": Strategy("sma_cross", sma_cross,
                          {"fast": (10, 20, 50), "slow": (100, 150, 200), "long_only": (False, True)}),
    "donchian": Strategy("donchian", donchian_breakout,
                         {"entry": (20, 55, 100), "exit_": (10, 20, 50)}),
    "ts_momentum": Strategy("ts_momentum", time_series_momentum,
                            {"lookback": (21, 63, 90, 126, 200), "long_only": (False, True)}),
    "mean_reversion": Strategy("mean_reversion", mean_reversion,
                               {"lookback": (2, 5, 10), "z": (0.5, 1.0, 1.5)}),
}


# --- composite: the only shape with a serious out-of-sample track record ------

def trend_with_risk_overlay(df: pd.DataFrame, lookback: int = 90,
                            target_vol: float = 0.40, buffer: float = 0.15,
                            long_only: bool = False, vol_lookback: int = 30) -> Positions:
    """Time-series momentum, volatility-targeted, with a no-trade buffer.

    This is the managed-futures shape: the signal supplies direction, the
    volatility target supplies survivability, and the buffer stops turnover from
    eating the result. On its own the signal is weak; the overlays are what make
    it investable.
    """
    raw = time_series_momentum(df, lookback=lookback, long_only=long_only)
    scaled = volatility_target(raw, df, target_ann_vol=target_vol,
                               lookback=vol_lookback, max_leverage=1.0)
    return apply_trade_buffer(scaled, buffer=buffer)


REGISTRY["trend_risk_managed"] = Strategy(
    "trend_risk_managed", trend_with_risk_overlay,
    {"lookback": (63, 90, 126), "target_vol": (0.25, 0.40),
     "buffer": (0.10, 0.20), "long_only": (False, True)},
)


def no_signal_ablation(df: pd.DataFrame, target_vol: float = 0.40,
                       buffer: float = 0.15, vol_lookback: int = 30) -> Positions:
    """The same risk machinery with the forecast deleted: always long.

    This is the control experiment. If a strategy cannot beat this, its signal
    contributes nothing and what looked like skill was the volatility overlay
    plus a rising market.
    """
    flat_long = pd.Series(1.0, index=df.index)
    scaled = volatility_target(flat_long, df, target_ann_vol=target_vol,
                               lookback=vol_lookback, max_leverage=1.0)
    return apply_trade_buffer(scaled, buffer=buffer)


REGISTRY["no_signal_ablation"] = Strategy(
    "no_signal_ablation", no_signal_ablation,
    {"target_vol": (0.25, 0.40), "buffer": (0.10, 0.20)},
)
