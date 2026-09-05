# Cross-asset check

Identical pipeline, identical settings, different underlying.

## BTC

`[PASS] 4787 rows 2013-07-29..2026-09-05 | calendar gaps=0 dupes=0 bad_prices=0 ohlc_violations=0 |move|>25%=4`

Control (no forecast, always long, vol-targeted): **Sharpe 1.065**

| Strategy | Sharpe | Beta | Alpha (t) | DSR | 24m Sharpe | Verdict |
|---|---|---|---|---|---|---|
| trend_risk_managed | 0.87 | 0.32 | +3.3% (+0.47) | 0.575 | +0.28 | REJECT: DSR > 0.95; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| sma_cross | 0.78 | 0.66 | -2.0% (-0.18) | 0.704 | +0.24 | REJECT: DSR > 0.95; PBO < 0.5; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| ts_momentum | 0.61 | 0.58 | -8.0% (-0.66) | 0.341 | +0.53 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown > -50%; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| donchian | 0.54 | 0.23 | +14.8% (+0.87) | 0.785 | -0.12 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| mean_reversion | -0.34 | 0.06 | -15.4% (-1.59) | 0.000 | -0.69 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| buy_and_hold | 1.04 | 1.00 | -1.0% (-7.70) | 0.650 | +0.58 | REJECT: DSR > 0.95; PBO < 0.5; drawdown > -50%; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |

## ETH

`[PASS] 3849 rows 2016-02-22..2026-09-05 | calendar gaps=0 dupes=0 bad_prices=0 ohlc_violations=0 |move|>25%=11`

Control (no forecast, always long, vol-targeted): **Sharpe 0.316**

| Strategy | Sharpe | Beta | Alpha (t) | DSR | 24m Sharpe | Verdict |
|---|---|---|---|---|---|---|
| trend_risk_managed | 0.54 | 0.22 | +4.3% (+0.55) | 0.701 | -0.43 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold |
| sma_cross | 0.57 | 0.45 | +15.8% (+0.84) | 0.436 | -0.77 | REJECT: Sharpe CI excludes 0; DSR > 0.95; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold |
| ts_momentum | 0.15 | 0.53 | -15.4% (-0.93) | 0.041 | -0.94 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| donchian | 0.60 | 0.12 | +34.5% (+1.50) | 0.650 | +0.35 | REJECT: Sharpe CI excludes 0; DSR > 0.95; drawdown > -50%; alpha t > 2.5 vs buy-and-hold |
| mean_reversion | -0.55 | 0.08 | -24.5% (-2.30) | 0.000 | -0.80 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold; beats no-signal ablation |
| buy_and_hold | 0.55 | 1.00 | -1.0% (-6.69) | 0.070 | +0.01 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown > -50%; edge alive in last 24m; alpha t > 2.5 vs buy-and-hold |

