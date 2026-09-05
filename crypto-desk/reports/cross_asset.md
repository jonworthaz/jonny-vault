# Cross-asset check

Identical pipeline, identical settings, different underlying.

## BTC

`[PASS] 4787 rows 2013-07-29..2026-09-05 | calendar gaps=0 dupes=0 bad_prices=0 ohlc_violations=0 |move|>25%=4`

Control (no forecast, always long, vol-targeted): **Sharpe 1.091**

| Strategy | Sharpe | Beta | Alpha (t) | Span t | DSR | 24m | Verdict |
|---|---|---|---|---|---|---|---|
| trend_risk_managed | 0.99 | 0.32 | +5.9% (+0.87) | +0.61 | 0.004 | +0.28 | REJECT: DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| sma_cross | 0.80 | 0.68 | -2.7% (-0.26) | +0.30 | 0.000 | +0.24 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| ts_momentum | 0.68 | 0.61 | -5.6% (-0.47) | -0.19 | 0.000 | +0.53 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| donchian | 0.63 | 0.14 | +22.0% (+1.39) | +1.34 | 0.000 | -0.01 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| mean_reversion | -0.35 | 0.06 | -15.6% (-1.61) | -1.55 | 0.000 | -0.75 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| buy_and_hold | 1.05 | 1.00 | -0.9% (n/a) | +0.42 | 0.005 | +0.58 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |

## ETH

`[PASS] 3849 rows 2016-02-22..2026-09-05 | calendar gaps=0 dupes=0 bad_prices=0 ohlc_violations=0 |move|>25%=11`

Control (no forecast, always long, vol-targeted): **Sharpe 0.279**

| Strategy | Sharpe | Beta | Alpha (t) | Span t | DSR | 24m | Verdict |
|---|---|---|---|---|---|---|---|
| trend_risk_managed | 0.56 | 0.22 | +4.8% (+0.63) | +1.30 | 0.004 | -0.43 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| sma_cross | 0.69 | 0.48 | +21.0% (+1.18) | +1.78 | 0.011 | -0.16 | REJECT: Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| ts_momentum | 0.31 | 0.55 | -6.4% (-0.42) | +0.46 | 0.000 | -0.31 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| donchian | 0.52 | 0.11 | +29.1% (+1.27) | +1.43 | 0.003 | +0.18 | REJECT: Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| mean_reversion | -0.53 | 0.07 | -23.1% (-2.19) | -1.99 | 0.000 | -0.66 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| buy_and_hold | 0.55 | 1.00 | -1.0% (n/a) | +2.19 | 0.004 | +0.01 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold |

