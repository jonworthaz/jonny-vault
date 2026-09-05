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

Rolling 1095d training window, 90d test blocks, 5d embargo. Parameters chosen only on data preceding each test block. Costs charged every bar. Trial count deflated at N=500 (the project's honest search budget, not one grid).

### The control experiment

Before reading any result below: this is **always long, volatility-targeted, no forecast of any kind**. It contains zero predictive information.

> **Control OOS Sharpe: 1.091** (CAGR 33.4%, max DD -50.0%)

Any strategy that does not beat this number has a signal that contributes nothing. This clause was added after an adversarial review found the first version of this gate certifying beta as alpha.

Trial-Sharpe variance pooled across 25 configurations: 1.162e-03. Expected best Sharpe under zero skill at N=500: **1.99**.

### Results

`alpha t` is versus buy-and-hold; `span t` is versus the no-signal control.

| Strategy | Venue | Sharpe | 95% CI | Beta | Alpha (t) | Span t | DSR | PBO | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| no_signal_ablation | cex_maker | 1.10 | [0.42, 1.87] | 0.43 | +4.6% (+0.97) | n/a | 0.002 | 0.49 | REJECT: DSR > 0.95; alpha t > 2.5 vs buy-and-hold |
| no_signal_ablation | cex_taker | 1.09 | [0.40, 1.86] | 0.43 | +4.1% (+0.88) | n/a | 0.002 | 0.50 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold |
| no_signal_ablation | base_amm_realistic | 1.07 | [0.37, 1.83] | 0.43 | +3.3% (+0.70) | n/a | 0.001 | 0.51 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold |
| buy_and_hold | cex_maker | 1.05 | [0.44, 1.76] | 1.00 | -0.5% (n/a) | +0.47 | 0.001 | n/a | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| buy_and_hold | cex_taker | 1.05 | [0.43, 1.75] | 1.00 | -0.9% (n/a) | +0.42 | 0.001 | n/a | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| trend_risk_managed | cex_maker | 1.04 | [0.30, 1.89] | 0.32 | +7.2% (+1.06) | +0.81 | 0.002 | 0.36 | REJECT: DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| buy_and_hold | base_amm_realistic | 1.04 | [0.42, 1.74] | 1.00 | -1.7% (n/a) | +0.33 | 0.001 | n/a | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| trend_risk_managed | cex_taker | 0.99 | [0.26, 1.85] | 0.32 | +5.9% (+0.87) | +0.61 | 0.001 | 0.34 | REJECT: DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| donchian | base_amm_realistic | 0.92 | [0.23, 1.58] | 0.44 | +9.7% (+0.93) | +1.07 | 0.000 | 0.27 | REJECT: DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| trend_risk_managed | base_amm_realistic | 0.91 | [0.18, 1.76] | 0.32 | +3.6% (+0.54) | +0.27 | 0.000 | 0.24 | REJECT: DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| sma_cross | base_amm_realistic | 0.91 | [0.28, 1.59] | 0.69 | +1.2% (+0.13) | +0.60 | 0.000 | 0.51 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| ts_momentum | base_amm_realistic | 0.89 | [0.20, 1.62] | 0.63 | +2.6% (+0.25) | +0.47 | 0.000 | 0.56 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| sma_cross | cex_maker | 0.85 | [0.19, 1.54] | 0.67 | +0.3% (+0.03) | +0.54 | 0.000 | 0.49 | REJECT: DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| sma_cross | cex_taker | 0.80 | [0.13, 1.50] | 0.68 | -2.7% (-0.26) | +0.30 | 0.000 | 0.50 | REJECT: DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| ts_momentum | cex_maker | 0.72 | [-0.02, 1.55] | 0.61 | -3.3% (-0.28) | -0.03 | 0.000 | 0.56 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| ts_momentum | cex_taker | 0.68 | [-0.06, 1.52] | 0.61 | -5.6% (-0.47) | -0.19 | 0.000 | 0.60 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| donchian | cex_maker | 0.66 | [-0.09, 1.31] | 0.15 | +23.3% (+1.47) | +1.44 | 0.000 | 0.60 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| donchian | cex_taker | 0.63 | [-0.11, 1.31] | 0.14 | +22.0% (+1.39) | +1.34 | 0.000 | 0.67 | REJECT: Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| mean_reversion | base_amm_realistic | 0.00 | [-0.44, 0.55] | 0.17 | -11.8% (-1.46) | -1.47 | 0.000 | 0.26 | REJECT: Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| mean_reversion | cex_maker | -0.16 | [-0.58, 0.31] | 0.06 | -9.6% (-1.00) | -0.93 | 0.000 | 0.17 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| mean_reversion | cex_taker | -0.35 | [-0.76, 0.14] | 0.06 | -15.6% (-1.61) | -1.55 | 0.000 | 0.13 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| random | cex_maker | -0.74 | [-1.40, -0.12] | 0.07 | -54.3% (-2.60) | -2.66 | 0.000 | 0.57 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| random | base_amm_realistic | -0.89 | [-1.54, -0.24] | 0.53 | -81.4% (-7.85) | -7.14 | 0.000 | 0.61 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |
| random | cex_taker | -1.39 | [-2.05, -0.79] | 0.08 | -98.5% (-4.74) | -4.76 | 0.000 | 0.57 | REJECT: positive OOS Sharpe; Sharpe CI excludes 0; DSR > 0.95; PBO < 0.5; drawdown within mandate; alpha t > 2.5 vs buy-and-hold; alpha t > 2.0 vs no-signal control |

**Read the alpha columns, not the Sharpe column.** A high Sharpe with beta near 1 and a t-statistic below 2 is the underlying asset, not a strategy.

### Warning flags (reported, not gated)

- `no_signal_ablation` / `cex_maker`: <Flags(allows_duplicate_labels=True)>
- `no_signal_ablation` / `cex_taker`: <Flags(allows_duplicate_labels=True)>
- `no_signal_ablation` / `base_amm_realistic`: <Flags(allows_duplicate_labels=True)>
- `buy_and_hold` / `cex_maker`: <Flags(allows_duplicate_labels=True)>
- `buy_and_hold` / `cex_taker`: <Flags(allows_duplicate_labels=True)>
- `buy_and_hold` / `base_amm_realistic`: <Flags(allows_duplicate_labels=True)>
- `trend_risk_managed` / `cex_taker`: <Flags(allows_duplicate_labels=True)>
- `donchian` / `base_amm_realistic`: <Flags(allows_duplicate_labels=True)>

## 3. Sensitivity — does the result survive its own settings?

| Sample start | test_days=60 | test_days=90 | test_days=180 |
|---|---|---|---|
| 2013-04-01 | 1.02 | 0.99 | 0.97 |
| 2015-01-01 | 0.86 | 0.83 | 0.87 |
| 2016-01-01 | 0.56 | 0.53 | 0.40 |

If these cells disagree, the headline number is a choice, not a measurement.

## 4. Regime check — is the edge still alive?

| Year | Strategy Sharpe | Strategy return | BTC return |
|---|---|---|---|
| 2015 | 1.20 | +14.6% | +55.7% |
| 2016 | 2.17 | +77.0% | +116.6% |
| 2017 | 3.35 | +191.8% | +1179.9% |
| 2018 | -1.99 | -26.9% | -77.1% |
| 2019 | 2.32 | +78.8% | +88.1% |
| 2020 | 1.04 | +45.7% | +304.2% |
| 2021 | 0.29 | +4.3% | +57.8% |
| 2022 | -2.11 | -23.7% | -63.4% |
| 2023 | 1.04 | +25.8% | +141.5% |
| 2024 | 1.48 | +39.6% | +97.4% |
| 2025 | -0.07 | -6.7% | -4.3% |
| 2026 | -0.93 | -3.3% | -5.7% |

**Last 24 months: Sharpe 0.28, return +7.9%.**

Beta to BTC 0.32, annualised alpha +5.9% with Newey-West t = +0.87. A t-statistic below 2 means the alpha is indistinguishable from zero.

## 5. Gate outcome

**Nothing cleared the funding gate.** The correct action is not to deploy capital.

