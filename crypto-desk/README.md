# Crypto Desk

**An evidence-first research platform for crypto directional strategies.**

Built to answer one question honestly: *does a tradeable edge exist at £1,000 of
capital, or does it only look like one?* The platform is designed so that
answering **"no"** is a normal, successful outcome — most tools in this space
cannot do that, which is precisely why they mislead.

> ⚠️ **This is research software. It places no orders, holds no keys, and moves
> no money.** Nothing here is financial advice.

## Why it exists

It was commissioned to evaluate a viral proposal: run 2,000–5,000 simulations on
a BTC direction bot until it beats 50% accuracy, add two more bots, deploy on
Base L2 with $400. See [`PRD.md`](./PRD.md) for the full brief and
[`reports/evaluation.md`](./reports/evaluation.md) for the verdict.

The short version of what the data said:

| Claim | Finding |
|---|---|
| "Target >50% accuracy" | BTC closes up ~51% of days. 50% is the coin, not the benchmark |
| "Run 2,000–5,000 simulations" | 5,000 *coin flips* reach ~55% accuracy on real BTC data. Search intensity manufactures the number |
| "58% accuracy" | Accuracy is decoupled from profit: large-move days are ~5x small-move days |
| "Base L2, fees are cheap" | Gas is cheap; the AMM spread isn't. Realistic pool needs ~74% accuracy to break even |
| "$400 starting stack" | Fixed costs don't scale down, minimums bind, and spot cannot short |

## Quick start

```bash
pip3 install numpy pandas scikit-learn
python3 tests/test_integrity.py     # prove the engine isn't lying
python3 run_evaluation.py           # full evaluation -> reports/evaluation.md
python3 run_evaluation.py --quick   # single venue, faster
python3 run_cross_asset.py          # BTC vs ETH -> reports/cross_asset.md
```

## How it resists fooling itself

| Failure mode | Defence | Where |
|---|---|---|
| Lookahead in features | Truncation-invariance test: removing the future must not change the past | `tests/test_integrity.py` |
| Trading a price you used to decide | Signal at close *t*, fill at open *t+1*, marked to open *t+2* | `data.forward_open_to_open_returns` |
| Costs quietly omitted | Per-venue fee + spread + impact + gas + funding, charged every bar | `costs.py`, `backtest.py` |
| Overfitting by search | Trial count tracked and fed to the Deflated Sharpe Ratio | `stats.deflated_sharpe_ratio` |
| Selection risk | Probability of Backtest Overfitting via CSCV | `stats.probability_of_backtest_overfitting` |
| Single lucky sample | Stationary bootstrap CI on Sharpe | `stats.stationary_bootstrap_ci` |
| Fitting to the test set | Purged, embargoed walk-forward; params chosen only on prior data | `walkforward.py` |
| Shorting on spot | Venue capability flags enforced in the backtester | `costs.Venue.can_short` |
| A verdict shaped by hope | Gate defined in advance, applied mechanically | `walkforward.verdict` |
| **Beta mistaken for alpha** | Newey-West alpha vs buy-and-hold, plus a forecast-free control | `benchmark.py`, `strategies.no_signal_ablation` |
| **A result fitted to one asset** | Identical pipeline replicated on ETH | `run_cross_asset.py` |
| **A point estimate hiding a range** | Sensitivity grid over sample start x refit frequency | `run_evaluation.sensitivity` |
| Illiquid-era fantasy returns | Pre-liquidity history truncated as a contiguous prefix | `data.trim_illiquid_history` |

## The funding gate

A strategy is only `FUNDABLE` if **every** clause holds:

- positive out-of-sample Sharpe
- bootstrap 95% CI on Sharpe excludes zero
- Deflated Sharpe Ratio > 0.95, deflated at the **project-wide** search budget
- Probability of Backtest Overfitting < 0.5, within comparable variant blocks
- maximum drawdown better than −50%
- **the edge is alive in the last 24 months** (not merely historical)
- **Newey-West alpha t-statistic > 2.5 vs buy-and-hold** — it must be alpha, not beta
- **it beats the no-signal ablation** — the same risk machinery with the forecast deleted

The last three clauses were added after an adversarial review. Without them the
gate returned `FUNDABLE` for a strategy that a *forecast-free* control beat.

Clearing the gate authorises **paper trading**, not capital. Capital requires
phase 4 sign-off (PRD §6).

## Current verdict

**REJECT — every strategy, both assets, every venue.** Nothing has measurable
alpha; no strategy reaches an alpha t-statistic of 0.9. The no-signal control
ranks *above* every strategy that actually predicts something.

See [`reports/critic-review.md`](./reports/critic-review.md) for the review that
overturned the first result, and [`reports/cross_asset.md`](./reports/cross_asset.md)
for the ETH replication.

## Layout

```
crypto-desk/
├── PRD.md                  problem, success criteria, scope, phase gates
├── run_evaluation.py       the harness -> reports/
├── run_cross_asset.py      BTC vs ETH replication
├── data/                   BTC and ETH daily OHLCV
├── src/
│   ├── data.py             loading + integrity checks + return alignment
│   ├── costs.py            venue cost models, breakeven accuracy
│   ├── features.py         causal feature construction
│   ├── strategies.py       candidates + risk overlays
│   ├── backtest.py         cost-aware simulation
│   ├── stats.py            DSR, PSR, PBO, stationary bootstrap
│   └── walkforward.py      purged/embargoed walk-forward + the gate
├── reports/                generated output
└── tests/test_integrity.py the tests that stop it lying
```

## Deliberate limitations

- **Daily bars, two assets, one vendor.** No intraday microstructure, and a
  single data provider cannot detect its own artifacts.
- **No live trading path.** By design. See PRD §8.
- **UK tax not modelled.** Every disposal is a CGT event; a high-turnover
  strategy carries a real admin burden that no backtest captures.
- **The cost model is an assumption until paper trading validates it.** That is
  the entire purpose of phase 3.
