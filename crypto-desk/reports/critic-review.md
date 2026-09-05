# Adversarial critic review — round 1

*An independent quant reviewer was run against the platform and its first result,
with a brief to veto capital allocation rather than to approve it.*

## Verdict

> **DO NOT FUND.** Honest Sharpe underwritten: **0.0**, with a 1-sigma band of
> roughly −0.3 to +0.4.

The first version of this platform returned `FUNDABLE` for a risk-managed trend
strategy at OOS Sharpe 1.13. **That verdict was wrong for four independent
reasons, any one of which is disqualifying.**

## What held up under attack

Stated first, because it is what makes the rest credible. The reviewer attacked
these and could not break them:

- **Signal-to-execution alignment is correct.** Returns are non-overlapping, no drift.
- **Every signal and feature is causal.** Truncation test: 0 mismatching bars out
  of 4,388, across all strategies and all 24 feature columns.
- **Shift test behaves correctly.** Sharpe by shift: −2 → 2.10, −1 → 2.09,
  **0 (as built) → 1.24**, +1 → 1.17, +2 → 1.15. Sharp discontinuity at zero,
  smooth decay after — the signature of no leakage.
- **Cost arithmetic is right.** A −1 → +1 flip is charged two units of turnover.
- **DSR matches Bailey & López de Prado.** Units consistently per-period.
- **The data is clean.** Zero duplicates, zero OHLC violations, no calendar gaps;
  only 4 moves >25% post-trim, all real events.

> "The engineering is better than most of what I see. The problem is not the
> code. The problem is that the code is measuring beta and the gate cannot tell."

## The four disqualifying defects

### 1. A 0.8%-of-sample data bug flipped the funding decision
`trim_illiquid_history` filtered row-wise, punching **40 holes** into 2013 —
dropping days *because BTC was cheap*, i.e. selecting on the dependent variable.

| Sample | Sharpe | DSR | Verdict |
|---|---|---|---|
| Old mask-trim (40 holes) | 1.132 | 0.962 | **FUNDABLE** |
| Fixed prefix-trim | 1.087 | 0.948 | REJECT |
| Start 2016-01-01 | 0.465 | 0.266 | REJECT |

Sharpe falls monotonically as early history is removed. **The edge lived in
2013–2015 — the era the code's own docstring calls untradeable.**

### 2. The trial count was understated ~20x
`n_trials = 24` counted one strategy's grid. The registry alone holds 80
configurations; including venue, walk-forward and design choices, the honest
count is ≥500.

| N | Expected max Sharpe under *zero skill* | DSR |
|---|---|---|
| 24 | 0.601 | 0.962 ← as reported |
| 76 | 0.738 | 0.906 ← fails |
| 500 | 0.927 | 0.754 |
| 5,000 | 1.120 | 0.517 ← the post's own trial count |

At 5,000 trials the expected maximum Sharpe under the null of zero skill is
**1.12** — indistinguishable from the observed 1.13.

### 3. PBO was computed on the wrong quantity; the true value is 0.81
It was built from **full-sample** variant returns, which do not describe the
walk-forward at all. The 24 "trials" had mean pairwise correlation 0.71. Mixing
long-only and long/short variants made CSCV detect a persistent *beta* ranking
and score it as "selection works". Restricted to the genuinely comparable choice
set: **PBO = 0.814 — worse than choosing at random.**

### 4. The gate had no benchmark clause — it certified beta as alpha
Every clause was measured against zero. Running the pipeline on a strategy with
**the signal deleted entirely** (constant long, vol-targeted, buffered):

```
NO-SIGNAL always-long vt=0.20: Sharpe 1.111 -> FUNDABLE
NO-SIGNAL always-long vt=0.15: Sharpe 1.163 -> FUNDABLE
NO-SIGNAL always-long vt=0.12: Sharpe 1.165 -> FUNDABLE
```

**A strategy containing zero predictive information scored higher than the
headline and passed the gate cleanly.** Direct ablation: always-long/vol-targeted
returned 32.2x vs the strategy's 20.6x. The momentum signal *subtracts* return.

## The decisive statistic

Regressing OOS returns on BTC over identical days:

```
beta = 0.31 (t = 69.7)   R2 = 0.55
alpha = +8.0%/yr   t = 1.52   Newey-West t = 1.46
```

Alpha t-stat by period: full OOS **1.52**, 2018+ **0.62**, 2021+ **−0.24**,
2023+ **−0.72**. **No period beats its own beta at significance, and the estimate
turns negative from 2021.** An OOS Sharpe of 1.09 is a 0.31-beta holding of an
asset whose Sharpe over the same days was 1.06.

## Other confirmed findings

- **Verdict oscillates with an arbitrary hyperparameter.** `test_days` of
  30/60/90/180/365 gives REJECT/FUNDABLE/REJECT/FUNDABLE/FUNDABLE.
- **The expanding window made adaptation impossible.** All 45 folds chose
  identical parameters. Forced to adapt: rolling 3y → Sharpe 0.875 (−65% DD),
  rolling 2y → 0.714 (−71% DD).
- **Costs are irrelevant here.** Turnover is ~5 round trips/year; it takes
  ~300bp/side to kill the strategy. Cost-robustness is not evidence of quality —
  it is evidence the "signal" is just persistent long exposure. Delaying the
  signal by **10 days** only moves Sharpe 1.244 → 1.027; a real timing edge
  decays fast under delay.
- **The execution-delay protection is worth 0.004 Sharpe.** In 24/7 crypto the
  close and next open are the same instant (median gap 4.6bp).
- **Survivorship at the universe level.** The chosen variant is long-only in all
  45 folds and 0.000% short. Conditioning on the one crypto asset that went up a
  million-fold and then measuring a long-biased strategy is the whole result.
- **`hit_rate` was off by one bar** — 197 bars mis-selected.
- **Shorts were free** — `funding_bps_day = 0`, silently subsidising every
  short-capable variant in the selection contest.

## On the original proposal

- **(a) The BTC direction bot's claimed 58% accuracy is *below* the 59.7%
  breakeven this repo computes for a daily-flipping CEX bot.** It loses money by
  construction.
- **(b)** A 6/10 altcoin hit rate from an unspecified process with no
  out-of-sample protocol is not evidence of anything.
- **(c)** A portfolio bot allocating between two strategies with no edge
  allocates between two strategies with no edge.
- **(d)** Base L2 at $400 raises breakeven accuracy from 59.7% to 67.0%. "Fees
  are cheap" measures gas and ignores the AMM fee and impact, which are ~16x larger.

## Fixes applied in response

| # | Fix | Where |
|---|---|---|
| 1 | Benchmark clause: Newey-West alpha t > 2.5 **and** must beat the no-signal ablation | `benchmark.py`, `walkforward.verdict` |
| 2 | `PROJECT_SEARCH_BUDGET = 500` fed to DSR; empirical cross-sectional trial variance | `walkforward.py` |
| 3 | PBO rebuilt from concatenated OOS fold returns, within comparable variant blocks | `walkforward.py` |
| 4 | Rolling 3-year training window is now the default | `WalkForwardConfig.expanding = False` |
| 5 | Sensitivity grid published (sample start x `test_days`) instead of a point estimate | `run_evaluation.py` |
| 6 | Short borrow charged (~7% APR); $10 minimums on CEX venues | `costs.py` |
| 7 | `hit_rate` mask, funding-before-revert, dead variable, misleading comment, CAGR time-compression | `backtest.py` |
| 8 | ETH added as a second asset; cross-asset check | `run_cross_asset.py` |
| 9 | Recency gate retained and enforced | `walkforward.verdict` |

## Result after fixes

Every strategy now fails, and the ranking tells the story: **the no-signal control
places above every strategy that actually predicts something.** No strategy
achieves an alpha t-statistic above 0.9.

The platform's own conclusion: **do not deploy capital.**

---

# Adversarial critic review — round 2

*The same reviewer, re-run against the fixed code, with two additional briefs:
verify each fix actually does what it claims, and check whether the fixes have
overcorrected the platform into rejecting everything.*

## Headline: the gate is not broken toward rejection

The reviewer built a **positive control** — a strategy whose signal is a blend of
the true forward return and noise, with a known information coefficient — and put
it through the platform's own walk-forward, cost model and gate.

```
 IC    Sharpe  alpha_t  span_t    DSR    maxDD   verdict
0.00    -1.18    -3.61   -3.60  0.000   -99.6%   REJECT (noise, correctly killed)
0.10    -0.08    -0.12   -0.11  0.000   -78.4%   REJECT
0.20     1.24    +4.05   +4.04  1.000   -43.1%   ** FUNDABLE **
0.30     2.33    +7.03   +6.93  0.992   -56.8%   REJECT: drawdown
```

**The gate passes a genuinely good strategy and kills noise.** The REJECT verdict
on the real strategies is therefore a finding, not an artifact.

(IC 0.30 is rejected on *realised* drawdown despite an alpha t-statistic of 7.0.
That is a deliberate risk decision for an account that cannot lose the stack, not
a failure of statistical power. It is now reported as such.)

## Fixes verified

| Round-1 fix | Round-2 result |
|---|---|
| Contiguous prefix truncation | **VERIFIED** — 0 calendar holes, exact suffix of the raw frame |
| PBO on OOS returns, within variant blocks | **VERIFIED, and correctly stricter** — `sma_cross` 0.086 → 0.500, `ts_momentum` 0.086 → 0.600 |
| Newey-West alpha | **VERIFIED** — matches an independent hand-coded HAC estimator to 5e-15; Monte-Carlo size 5.5–7.4% vs OLS 4.8–30.5% under serial correlation |
| Rolling window | **VERIFIED, and it mattered** — expanding window had inflated the headline by 0.21 Sharpe; distinct parameter sets 1 → 10 |
| `hit_rate` / CAGR cleanups | **VERIFIED** but cosmetic |
| Cross-asset ETH | **VERIFIED** — genuine corroboration; the shape does not replicate |

## Fixes that FAILED, and are now actually fixed

### The carry cost was 96x too small
`funding_bps_day = 0.02` with the code's `1e-4` scaling is **0.073% APR**, not the
7% the comment claimed. Shorts were still free to three decimal places. Worse,
carry was charged on `abs(position)` — taxing *longs* on a spot venue, where a
long is owned rather than borrowed, and long-only variants win 93–98% of folds.

→ Corrected to `1.918` bps/day with a new `carry_on_short_only` flag, and
`Venue.carry_fraction()` now owns the rule so both code paths cannot diverge.

### The DSR trial variance made the gate *more lenient*
The round-1 change replaced the theoretical null with the observed variance of
trial Sharpes — but measured it across one strategy's 4–24 near-identical
variants. Correlated trials cluster, so their observed spread is narrow, so the
expected-maximum bar comes out **low**. The reviewer measured it at **10.6x too
small**, and the code comment justifying it was empirically backwards.

```
median within-strategy V (shipped)  = 1.08e-04  -> needs Sharpe 1.10 to clear DSR
theoretical 1/n (what it replaced)  = 2.53e-04  -> needs Sharpe 1.43
honest cross-project V              = 1.15e-03  -> needs Sharpe 2.47
```

→ Now deflated against the theoretical null by default, with
`pool_trial_variance()` computing the variance across **every configuration the
run evaluated** and `apply_pooled_variance()` re-deflating each result.

## New defects found, and fixed

1. **`run_backtest` reported positions that were never held.** The minimum-notional
   branch reverted the position for the simulation but returned the *requested*
   series, so exposure, turnover, hit rate and directional accuracy were computed
   on a counterfactual book. → Now returns the held series, with a test.
2. **`newey_west_alpha` had no tracking-error floor.** Buy-and-hold regressed on
   itself scored t = −7.70 because the residual is a near-noiseless cost stream.
   The sign happened to be negative; a small positive cost advantage would have
   manufactured a spurious **+7.70** straight through the gate's headline clause.
   → Alpha t is now undefined below 1% annualised tracking error.
3. **`min_notional_usd = 10` never bound** (0 binds in 2.9M simulated bars) yet
   disabled the vectorised fast path for every configured venue, and its branch
   had no test. → Test added covering both suppression and correct reporting.
4. **`_score_result` degraded silently on ragged variant columns** — a truncated
   variant swung PBO 0.643 → 0.329 with no warning. Currently unreachable in
   production; documented.

## Design flaws the new power test found from the inside

Adding the positive control to the suite immediately caught something neither
critic round had: **the platform selected for what it then punished.** Variant
selection ranked purely on training Sharpe, so it chose the highest-volatility
configuration available — which the gate then rejected on drawdown.

→ `MAX_DRAWDOWN_MANDATE` is now a single constant used by *both* the selection
step and the gate. A variant that already breaches the mandate in training is
disqualified before it can win. This alone moved the positive control at IC 0.20
from `REJECT: drawdown` to `FUNDABLE`.

The reviewer also noted the drawdown clause does most of the rejecting — it
appears in 21 of 24 BTC rows — which the README now says plainly.

## Clauses re-specified on the reviewer's argument

- **`beats no-signal ablation` → a spanning test.** Comparing raw Sharpes
  conflates "does the signal add information" with "does it beat BTC", and would
  reject a genuinely good low-beta diversifier for being smaller than a levered
  long in a bull market. Now: alpha of the strategy regressed *on the control*,
  t > 2.0.
- **`recent_24m_sharpe > 0.3` demoted from gate to flag.** The standard error of a
  two-year Sharpe is ≈0.71, so as a hard AND-clause it discards genuinely good
  strategies ~38% of the time at a true Sharpe of 0.5, and fires against any
  trend strategy in chop by construction. Reported loudly via `flags()`, gated
  softly.

## Verdict

> **"Do not deploy £1,000 to this" is correct**, and now for reasons that survive
> every defect found in both rounds.

The evidence carrying it does not depend on the gate arithmetic at all:

- best real strategy OOS Sharpe **0.874** against a no-forecast control at **1.065** — the signal *subtracts* value
- maximum alpha t across 24 BTC configurations: **+0.87**
- ETH does not replicate (24-month Sharpe **−0.43**)
- the result is carried by 2013–2015 (2016-start Sharpe 0.40–0.59)

The reviewer's own summary: correcting every defect "moves nothing by more than
~0.08 Sharpe against a ~0.19 deficit to a control with no forecast in it. The
sign does not flip."
