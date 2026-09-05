# Crypto Desk — Evaluation Report

*Generated 2026-09-05 · BTC/USD daily · 2013-07-29 to 2026-09-05 (4787 bars)*

Data integrity: `[PASS] 5895 rows 2010-07-17..2026-09-05 | calendar gaps=0 dupes=0 bad_prices=0 ohlc_violations=0 |move|>25%=27`

## 1. Auditing the proposal's claims

### Claim: "getting above 50 percent accuracy" is the target

| Window | Days | Up-day rate | Mean daily |
|---|---|---|---|
| full sample | 4786 | 52.6% | +0.209% |
| last 5y | 1825 | 49.7% | +0.060% |
| last 3y | 1095 | 50.9% | +0.133% |
| last 1y | 365 | 48.5% | -0.063% |

**Always predicting "up" scores 50.9% for free.** 50% is not the benchmark; the base rate is. An edge is what you have *above* it.

### Claim: run 2,000-5,000 simulations, keep what beats 50%

| Simulations run | Best accuracy found | Skill involved |
|---|---|---|
| 100 | 53.5% | none (coin flips) |
| 1,000 | 55.6% | none (coin flips) |
| 2,000 | 55.3% | none (coin flips) |
| 5,000 | 55.4% | none (coin flips) |

**5,000 coin flips produce a best result near 55% on 1095 days of real BTC data.** Selecting the maximum of a large search is not measurement, it is sampling the right tail of noise.

Expressed as Sharpe: after 5,000 trials on 1095 observations, a **zero-skill** search is expected to produce a best annualised Sharpe of **2.13**. Any result below that bar is indistinguishable from luck.

### Claim: run it on Base L2 "because fees are cheap"

Mean absolute daily move (3y): **1.73%**. Breakeven accuracy on $400:

| Venue | Round-trip cost | Accuracy needed to break even |
|---|---|---|
| CEX spot, maker | 0.220% | **56.4%** |
| CEX spot, taker | 0.460% | **63.3%** |
| CEX spot, taker, long-only | 0.460% | **63.3%** |
| Perp DEX | 0.150% | **54.3%** |
| Base L2 AMM, 5bp pool (optimistic) | 0.215% | **56.2%** |
| Base L2 AMM, 30bp pool (realistic) | 0.825% | **73.9%** |

Gas on Base is genuinely cheap. Gas is not the cost — the AMM fee and price impact are, and on a realistic pool they demand accuracy far above anything claimed. **The proposal optimises the smallest cost term and ignores the largest.**

### Why accuracy is the wrong objective entirely

Small-move days average 0.63%; large-move days average 4.13% (6.6x). A model that is 58% right on small days and 45% right on large days has ~52% blended accuracy and **loses money before costs**. Accuracy weights every day equally; the market does not.

## 2. Walk-forward evaluation

Expanding window, min train 730d, test 90d, embargo 5d. Parameters chosen only on data preceding each test block. Costs charged every bar.

| Strategy | Venue | OOS Sharpe | 95% CI | CAGR | Max DD | DSR | PBO | Dir. acc | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| trend_risk_managed | cex_maker | 1.14 | [0.45, 1.88] | 29.1% | -43.1% | 0.965 | 0.43 | 53.5% | FUNDABLE |
| sma_cross | cex_maker | 1.14 | [0.48, 1.83] | 58.5% | -63.6% | 0.969 | 0.04 | 53.8% | REJECT: drawdown > -50% |
| sma_cross | cex_taker | 1.12 | [0.46, 1.82] | 57.1% | -63.9% | 0.965 | 0.04 | 53.8% | REJECT: drawdown > -50% |
| sma_cross | base_amm_realistic | 1.10 | [0.44, 1.80] | 55.5% | -64.4% | 0.960 | 0.24 | 53.8% | REJECT: drawdown > -50% |
| donchian | base_amm_realistic | 1.10 | [0.44, 1.73] | 44.3% | -53.7% | 0.984 | 0.11 | 54.4% | REJECT: drawdown > -50% |
| ts_momentum | cex_maker | 1.10 | [0.40, 1.75] | 50.4% | -62.1% | 0.981 | 0.16 | 53.1% | REJECT: drawdown > -50% |
| trend_risk_managed | cex_taker | 1.09 | [0.40, 1.84] | 27.3% | -44.5% | 0.948 | 0.41 | 53.5% | REJECT: DSR > 0.95 |
| buy_and_hold | cex_maker | 1.05 | [0.44, 1.76] | 61.2% | -86.5% | 0.998 | n/a | 52.5% | REJECT: drawdown > -50% |
| buy_and_hold | cex_taker | 1.05 | [0.43, 1.75] | 60.4% | -86.6% | 0.998 | n/a | 52.5% | REJECT: drawdown > -50% |
| buy_and_hold | base_amm_realistic | 1.04 | [0.42, 1.74] | 59.3% | -86.7% | 0.998 | n/a | 52.5% | REJECT: drawdown > -50% |
| ts_momentum | cex_taker | 1.01 | [0.31, 1.66] | 44.2% | -63.7% | 0.962 | 0.21 | 53.1% | REJECT: drawdown > -50% |
| trend_risk_managed | base_amm_realistic | 0.99 | [0.30, 1.76] | 24.3% | -47.8% | 0.905 | 0.91 | 53.4% | REJECT: DSR > 0.95; PBO < 0.5 |
| donchian | cex_maker | 0.82 | [0.10, 1.51] | 35.9% | -83.0% | 0.887 | 0.39 | 53.8% | REJECT: DSR > 0.95; drawdown > -50% |
| donchian | cex_taker | 0.80 | [0.07, 1.49] | 33.9% | -83.2% | 0.869 | 0.39 | 53.8% | REJECT: DSR > 0.95; drawdown > -50% |
| ts_momentum | base_amm_realistic | 0.79 | [0.06, 1.51] | 30.3% | -78.5% | 0.846 | 0.70 | 53.0% | REJECT: DSR > 0.95; PBO < 0.5; drawdown > -50% |
| mean_reversion | base_amm_realistic | -0.05 | [-0.44, 0.38] | -6.2% | -61.4% | 0.045 | 0.06 | 57.3% | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50% |
| mean_reversion | cex_maker | -0.07 | [-0.52, 0.40] | -6.5% | -61.0% | 0.039 | 0.01 | 54.5% | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50% |
| mean_reversion | cex_taker | -0.29 | [-0.75, 0.18] | -12.7% | -81.2% | 0.006 | 0.00 | 55.1% | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50% |
| random | cex_maker | -0.75 | [-1.34, -0.13] | -51.7% | -100.0% | 0.000 | 0.41 | 49.7% | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50% |
| random | base_amm_realistic | -0.93 | [-1.59, -0.34] | -42.7% | -99.8% | 0.000 | 0.37 | 51.9% | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50% |
| random | cex_taker | -1.40 | [-2.03, -0.80] | -68.9% | -100.0% | 0.000 | 0.47 | 49.7% | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown > -50% |

## 3. Regime check — is the edge still alive?

| Period | Days | Sharpe | Return |
|---|---|---|---|
| 2015 | 149 | 1.20 | +14.6% |
| 2016 | 358 | 2.17 | +77.0% |
| 2017 | 357 | 3.23 | +195.6% |
| 2018 | 357 | -2.66 | -37.9% |
| 2019 | 357 | 2.45 | +88.7% |
| 2020 | 358 | 1.76 | +53.8% |
| 2021 | 355 | 0.80 | +17.7% |
| 2022 | 357 | -2.12 | -23.2% |
| 2023 | 357 | 1.42 | +38.0% |
| 2024 | 358 | 1.20 | +27.8% |
| 2025 | 357 | -0.48 | -9.8% |
| 2026 | 240 | -1.02 | -11.8% |

**Last 24 months: Sharpe 0.09, return -0.1%.**

## 4. Gate outcome

1 configuration(s) cleared the gate:

- `trend_risk_managed` on `cex_maker`: Sharpe 1.14, CAGR 29.1%, max DD -43.1%, DSR 0.965

Clearing the gate authorises **paper trading**, not capital. See PRD §6.

