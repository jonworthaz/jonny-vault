"""Data loading and integrity checks.

The single most common way a crypto backtest lies is bad data, so nothing is
trusted until it has passed `validate`.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

REQUIRED_COLUMNS = ("open", "high", "low", "close", "volume")


@dataclass(frozen=True)
class IntegrityReport:
    """Outcome of `validate`. `ok` is False if any hard check failed."""

    rows: int
    start: pd.Timestamp
    end: pd.Timestamp
    missing_days: int
    duplicate_dates: int
    non_positive_prices: int
    ohlc_violations: int
    extreme_moves: int

    @property
    def ok(self) -> bool:
        return (
            self.duplicate_dates == 0
            and self.non_positive_prices == 0
            and self.ohlc_violations == 0
        )

    def describe(self) -> str:
        flag = "PASS" if self.ok else "FAIL"
        return (
            f"[{flag}] {self.rows} rows {self.start.date()}..{self.end.date()} | "
            f"calendar gaps={self.missing_days} dupes={self.duplicate_dates} "
            f"bad_prices={self.non_positive_prices} ohlc_violations={self.ohlc_violations} "
            f"|move|>25%={self.extreme_moves}"
        )


def load_ohlcv(path: str | Path = DATA_DIR / "btc_usd_daily.csv") -> pd.DataFrame:
    """Load a daily OHLCV CSV into a UTC-dated, ascending, deduplicated frame."""
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.set_index("date").sort_index()
    df = df[~df.index.duplicated(keep="last")]
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"{path}: missing required columns {missing}")
    return df[list(REQUIRED_COLUMNS)].astype(float)


def validate(df: pd.DataFrame) -> IntegrityReport:
    """Run integrity checks. Cheap to run, and it has caught real problems."""
    close = df["close"]
    expected = pd.date_range(df.index.min(), df.index.max(), freq="D")
    ohlc_violations = int(
        (
            (df["high"] < df[["open", "close"]].max(axis=1))
            | (df["low"] > df[["open", "close"]].min(axis=1))
            | (df["high"] < df["low"])
        ).sum()
    )
    return IntegrityReport(
        rows=len(df),
        start=df.index.min(),
        end=df.index.max(),
        missing_days=int(len(expected) - len(df.index.intersection(expected))),
        duplicate_dates=int(df.index.duplicated().sum()),
        non_positive_prices=int((df[["open", "high", "low", "close"]] <= 0).sum().sum()),
        ohlc_violations=ohlc_violations,
        extreme_moves=int((close.pct_change().abs() > 0.25).sum()),
    )


def trim_illiquid_history(df: pd.DataFrame, min_close: float = 100.0) -> pd.DataFrame:
    """Drop the pre-liquidity era, as a contiguous prefix.

    BTC below ~$100 traded on venues that no longer exist, with spreads that make
    any backtested edge from that period meaningless. Including it is the easiest
    way to manufacture a spectacular, untradeable equity curve.

    This truncates at the last date the threshold was breached rather than
    filtering rows by price. Row-wise filtering would punch holes in the middle of
    the series -- breaking every rolling window that crosses one -- and would drop
    days *because* they were cheap, which is a selection bias on the very variable
    being predicted.
    """
    below = df.index[df["close"] < min_close]
    if len(below) == 0:
        return df
    return df[df.index > below.max()]


def forward_open_to_open_returns(df: pd.DataFrame) -> pd.Series:
    """Return r_t = open_{t+2}/open_{t+1} - 1, aligned to the signal date t.

    This is the return actually available to a decision made at the close of day
    t: you cannot trade the close you are still using to decide, so you enter at
    the next open and exit at the one after.
    """
    nxt = df["open"].shift(-1)
    return (df["open"].shift(-2) / nxt - 1.0).rename("fwd_ret")
