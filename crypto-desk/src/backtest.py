"""Vectorised daily backtester with explicit, non-optional costs.

Conventions
-----------
A signal is formed at the close of day t. It cannot be executed at that close --
that price is part of the information used to form it -- so the position is
entered at the open of t+1 and marked to the open of t+2. `positions` is indexed
by the signal date t and `forward_open_to_open_returns` supplies the matching
return, so alignment cannot silently drift.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .costs import Venue
from .data import forward_open_to_open_returns

TRADING_DAYS = 365  # crypto trades every day


@dataclass
class BacktestResult:
    net_returns: pd.Series
    gross_returns: pd.Series
    costs: pd.Series
    positions: pd.Series
    equity: pd.Series
    venue: str
    metrics: dict[str, float] = field(default_factory=dict)

    def summary_row(self, name: str) -> dict:
        return {"strategy": name, "venue": self.venue, **self.metrics}


def run_backtest(
    df: pd.DataFrame,
    positions: pd.Series,
    venue: Venue,
    starting_equity: float = 1000.0,
    max_leverage: float = 1.0,
) -> BacktestResult:
    """Simulate `positions` on `df` under `venue`'s cost model."""
    fwd = forward_open_to_open_returns(df)
    pos = positions.reindex(df.index).fillna(0.0).clip(-max_leverage, max_leverage)
    if not venue.can_short:
        pos = pos.clip(lower=0.0)

    valid = fwd.notna()
    pos, fwd = pos[valid], fwd[valid]

    # Fast path. Every cost term except fixed gas and the minimum-notional rule is
    # a fraction of equity and therefore path-independent, so when a venue has
    # neither, the whole simulation is a vector operation. `test_fast_path_matches
    # _loop` in tests/ asserts this agrees with the loop to floating-point noise.
    if venue.gas_usd == 0.0 and venue.min_notional_usd == 0.0:
        turnover = pos.diff()
        turnover.iloc[0] = pos.iloc[0]
        turnover = turnover.abs()
        carry = pos.map(venue.carry_fraction)
        cost_s = (venue.cost_bps_per_side * 1e-4 * turnover + carry).rename("cost")
        gross_s = (pos * fwd).rename("gross")
        net_s = (gross_s - cost_s).rename("net")
        eq_s = (starting_equity * (1.0 + net_s).cumprod()).rename("equity")
        res = BacktestResult(net_s, gross_s, cost_s, pos, eq_s, venue.name)
        res.metrics = compute_metrics(res, starting_equity)
        return res

    equity = starting_equity
    prev_pos = 0.0
    eq_path, gross_l, cost_l, held_l = [], [], [], []

    for date, p in pos.items():
        turnover = abs(p - prev_pos)
        traded_notional = turnover * equity

        # Below the venue minimum the order cannot be placed, so the position
        # stays where it was. This is resolved BEFORE any cost is computed --
        # charging funding on a position that was never taken was a real bug.
        if 0 < traded_notional < venue.min_notional_usd:
            p, turnover = prev_pos, 0.0

        # Every term is expressed as a fraction of equity, so the fixed gas cost
        # is divided by equity rather than by the traded notional: paying $0.05
        # of gas costs the account 0.05/equity of its value regardless of how
        # much of it was traded.
        variable = venue.cost_bps_per_side * 1e-4 * turnover
        fixed = (venue.gas_usd / equity) if turnover > 1e-12 else 0.0
        cost = variable + fixed + venue.carry_fraction(p)
        gross = p * fwd.loc[date]
        net = gross - cost

        equity *= 1.0 + net
        eq_path.append(equity)
        gross_l.append(gross)
        cost_l.append(cost)
        # Record what was actually held, not what was requested. When the
        # minimum-notional rule suppresses a trade these differ, and every
        # exposure and accuracy metric is computed from this series.
        held_l.append(p)
        prev_pos = p
        if equity <= 0:
            break

    idx = pos.index[: len(eq_path)]
    gross_s = pd.Series(gross_l, index=idx, name="gross")
    cost_s = pd.Series(cost_l, index=idx, name="cost")
    net_s = (gross_s - cost_s).rename("net")
    eq_s = pd.Series(eq_path, index=idx, name="equity")

    held_s = pd.Series(held_l, index=idx, name="position")
    res = BacktestResult(net_s, gross_s, cost_s, held_s, eq_s, venue.name)
    res.metrics = compute_metrics(res, starting_equity)
    return res


def compute_metrics(res: BacktestResult, starting_equity: float) -> dict[str, float]:
    net, eq, pos = res.net_returns, res.equity, res.positions
    n = len(net)
    if n == 0:
        return {}
    # Rows are dropped where the forward return is unavailable, so counting rows
    # under-states elapsed time and over-states CAGR. Use the calendar span.
    span = (net.index[-1] - net.index[0]).days
    years = max(span, 1) / TRADING_DAYS
    total = eq.iloc[-1] / starting_equity - 1.0
    # A blown-up account has no meaningful growth rate; report -100% rather than
    # taking a fractional power of a non-positive number.
    growth = eq.iloc[-1] / starting_equity
    cagr = (growth ** (1 / years) - 1.0) if (years > 0 and growth > 0) else -1.0
    vol = net.std() * np.sqrt(TRADING_DAYS)
    sharpe = (net.mean() / net.std() * np.sqrt(TRADING_DAYS)) if net.std() > 0 else np.nan
    downside = net[net < 0].std()
    sortino = (net.mean() / downside * np.sqrt(TRADING_DAYS)) if downside and downside > 0 else np.nan
    dd = (eq / eq.cummax() - 1.0)
    maxdd = dd.min()
    turnover = pos.diff().abs().fillna(pos.abs()).sum()
    # Positions are already indexed by signal date with the matching forward
    # return at the same index, so no shift is needed here. The shift that used
    # to be here mis-selected ~200 bars.
    traded = net[pos != 0]
    return {
        "n_days": float(n),
        "years": round(years, 2),
        "total_return": total,
        "cagr": cagr,
        "ann_vol": vol,
        "sharpe": sharpe,
        "sortino": sortino,
        "max_drawdown": maxdd,
        "calmar": (cagr / abs(maxdd)) if maxdd < 0 else np.nan,
        "hit_rate": float((traded > 0).mean()) if len(traded) else np.nan,
        "exposure": float((pos != 0).mean()),
        "turnover_per_yr": turnover / years if years > 0 else np.nan,
        "cost_drag_per_yr": res.costs.sum() / years if years > 0 else np.nan,
        "final_equity": eq.iloc[-1],
    }


def directional_accuracy(positions: pd.Series, df: pd.DataFrame) -> float:
    """Fraction of non-flat bars where the position sign matched the move.

    Reported for comparison with the '58% accuracy' claim only. It is not a
    measure of profitability and this codebase never optimises for it.
    """
    fwd = forward_open_to_open_returns(df)
    p = positions.reindex(df.index).fillna(0.0)
    mask = (p != 0) & fwd.notna() & (fwd != 0)
    if mask.sum() == 0:
        return float("nan")
    return float((np.sign(p[mask]) == np.sign(fwd[mask])).mean())
