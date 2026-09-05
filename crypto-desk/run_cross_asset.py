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

import numpy as np
import pandas as pd

from src.costs import VENUES
from src.data import DATA_DIR, load_ohlcv, trim_illiquid_history, validate
from src.strategies import REGISTRY
from src.walkforward import (
    WalkForwardConfig, apply_pooled_variance, pool_trial_variance, verdict, walk_forward,
)

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
        runs = []
        emit(f"Control (no forecast, always long, vol-targeted): **Sharpe {a:.3f}**\n")
        for name in ("trend_risk_managed", "sma_cross", "ts_momentum", "donchian",
                     "mean_reversion", "buy_and_hold"):
            r = walk_forward(df, REGISTRY[name], venue, cfg,
                             ablation_returns=abl.oos_returns)
            if r.metrics:
                runs.append((name, r))
        pooled = pool_trial_variance([abl] + [r for _, r in runs])
        for _, r in runs:
            apply_pooled_variance(r, pooled)

        emit("| Strategy | Sharpe | Beta | Alpha (t) | Span t | DSR | 24m | Verdict |")
        emit("|---|---|---|---|---|---|---|---|")
        for name, r in runs:
            m = r.metrics
            at = "n/a" if np.isnan(m["alpha_t"]) else f"{m['alpha_t']:+.2f}"
            st = "n/a" if np.isnan(m["alpha_t_vs_ablation"]) else f"{m['alpha_t_vs_ablation']:+.2f}"
            emit(f"| {name} | {m['oos_sharpe']:.2f} | {m['beta_to_btc']:.2f} | "
                 f"{m['alpha_ann']:+.1%} ({at}) | {st} | {m['dsr']:.3f} | "
                 f"{m['recent_24m_sharpe']:+.2f} | {verdict(m)} |")
        emit()

    reports = Path(__file__).resolve().parent / "reports"
    reports.mkdir(exist_ok=True)
    (reports / "cross_asset.md").write_text("\n".join(OUT) + "\n")
    print(f"\nWrote {reports/'cross_asset.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
