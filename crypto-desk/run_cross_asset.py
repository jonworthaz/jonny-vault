#!/usr/bin/env python3
"""Cross-asset check: does the shape generalise, or was it fitted to BTC?

An adversarial review flagged that every conclusion in this project rested on a
single asset from a single vendor -- and on the one crypto asset that happened to
go up a million-fold, which is survivorship bias at the universe level. This
script re-runs the identical pipeline on ETH.

A real edge should appear in both. An artifact of BTC's particular history
should not.
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd

from src.costs import VENUES
from src.data import DATA_DIR, load_ohlcv, trim_illiquid_history, validate
from src.strategies import REGISTRY
from src.walkforward import WalkForwardConfig, verdict, walk_forward

OUT: list[str] = []


def emit(line: str = "") -> None:
    print(line)
    OUT.append(line)


def main() -> int:
    cfg = WalkForwardConfig()
    venue = VENUES["cex_taker"]
    emit("# Cross-asset check\n")
    emit("Identical pipeline, identical settings, different underlying.\n")

    for label, fname, floor in (("BTC", "btc_usd_daily.csv", 100.0),
                                ("ETH", "eth_usd_daily.csv", 5.0)):
        raw = load_ohlcv(DATA_DIR / fname)
        df = trim_illiquid_history(raw, min_close=floor)
        rep = validate(df)
        emit(f"## {label}\n")
        emit(f"`{rep.describe()}`\n")

        abl = walk_forward(df, REGISTRY["no_signal_ablation"], venue, cfg)
        a = abl.metrics["oos_sharpe"]
        emit(f"Control (no forecast, always long, vol-targeted): **Sharpe {a:.3f}**\n")
        emit("| Strategy | Sharpe | Beta | Alpha (t) | DSR | 24m Sharpe | Verdict |")
        emit("|---|---|---|---|---|---|---|")
        for name in ("trend_risk_managed", "sma_cross", "ts_momentum", "donchian",
                     "mean_reversion", "buy_and_hold"):
            m = walk_forward(df, REGISTRY[name], venue, cfg, ablation_sharpe=a).metrics
            if not m:
                continue
            emit(f"| {name} | {m['oos_sharpe']:.2f} | {m['beta_to_btc']:.2f} | "
                 f"{m['alpha_ann']:+.1%} ({m['alpha_t']:+.2f}) | {m['dsr']:.3f} | "
                 f"{m['recent_24m_sharpe']:+.2f} | {verdict(m)} |")
        emit()

    reports = Path(__file__).resolve().parent / "reports"
    reports.mkdir(exist_ok=True)
    (reports / "cross_asset.md").write_text("\n".join(OUT) + "\n")
    print(f"\nWrote {reports/'cross_asset.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
