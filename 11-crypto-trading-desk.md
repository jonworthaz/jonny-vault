# 11 — Crypto Trading Desk

*Vault node: what we learned testing an AI crypto trading bot against real data.*
*Build: [`/crypto-desk`](./crypto-desk/) · PRD: [`crypto-desk/PRD.md`](./crypto-desk/PRD.md) · Report: [`crypto-desk/reports/evaluation.md`](./crypto-desk/reports/evaluation.md)*

## The origin

A viral post proposed: spend $100 of a $500 stack on a Claude account, run
2,000–5,000 simulations on a BTC direction bot until it beats 50% accuracy
("ours runs at about 58%"), add an altcoin research bot and a portfolio bot, let
them talk to each other, and deploy on Base L2 because fees are cheap.

We tested it rather than believed it. **The strategy as described does not
survive contact with data.** One reshaped version of it does — barely, and with
conditions.

## The five transferable lessons

### 1. Directional accuracy is a vanity metric
Accuracy weights every day equally. Markets don't. BTC's large-move days average
~5x the size of small-move days, so a model that is right on quiet days and wrong
on violent ones can be 58% accurate and still lose money. **We optimise PnL after
costs; we never optimise accuracy.**

### 2. "Run 5,000 simulations and keep the winner" is a false-positive machine
5,000 pure coin-flip strategies, tested on three years of real BTC daily data,
produce a best in-sample accuracy of ~55% — with zero skill. In Sharpe terms, a
zero-skill search over 5,000 trials is *expected* to yield a best annualised
Sharpe above 2.0. **The number of things you tried is part of the result.** If it
isn't reported, the result isn't evidence.

> This is the single most valuable idea in the node, and it generalises far
> beyond trading: A/B tests, ad creative, growth experiments, prompt tuning.
> Search hard enough and noise will hand you a winner every time.

### 3. Fees are not the cost — the spread is
The post picks Base L2 to save gas. Gas is real but tiny. The cost that decides
profitability is the AMM fee plus price impact: on a realistic 30bp pool that's
~0.83% round trip, requiring **~74% directional accuracy** to break even. A CEX
maker order requires ~56%. **Optimising the visible cost while ignoring the
invisible one is the most common retail mistake.**

### 4. Small capital is a structural disadvantage, not just a small version of big capital
Fixed costs don't scale down. $0.05 of gas is 1.25bps on $400 and 0.05bps on
$10,000. Minimum order sizes bind. And on spot you cannot short — so a "market
direction" model's down-signal is only actionable as *move to cash*, which throws
away roughly half the signal's value.

### 5. Multi-agent architecture is not a source of edge
Three bots talking to each other adds latency, failure modes and cost. It does
not create alpha. Coordination is worth building *after* a single component has a
measured edge — never before.

## What survived: nothing

The first run of this platform produced a `FUNDABLE` verdict for a risk-managed
trend strategy at OOS Sharpe 1.13. **An adversarial critic review destroyed it**,
and it was wrong for four independent reasons — any one disqualifying:

1. **A 0.8%-of-sample data bug flipped the decision.** Filtering out days where
   BTC traded below $100 punched 40 holes into 2013 and selected on the dependent
   variable. Removing 40 days out of 4,787 reversed the funding call. Sharpe fell
   monotonically as early history was removed — the edge lived in 2013–2015, the
   era the code's own docstring calls untradeable.
2. **The trial count was understated ~20x.** Deflating for 24 trials instead of
   the honest ≥500 was the difference between DSR 0.96 (pass) and 0.75 (fail).
3. **The overfitting statistic was computed on the wrong data.** Rebuilt
   correctly, PBO was **0.81** — the selection procedure was *worse than random*.
4. **The gate had no benchmark clause, so it certified beta as alpha.** A
   strategy with the forecast deleted entirely — constant long, volatility
   targeted — scored a **higher** Sharpe and passed the gate cleanly.

That fourth one is the lesson worth keeping. Regressing the strategy on BTC over
identical days: beta 0.31, alpha +8%/yr with a t-statistic of **1.5** — and
negative from 2021. The "strategy" was a one-third-sized holding of BTC.

A second critic round then found the first round of fixes had *two failures of
its own* — the short-borrow cost was 96x too small, and the deflation change had
made the gate **more lenient, not stricter** (correlated trials cluster, so their
observed spread is narrow, so the noise bar comes out low). Both are now fixed.

After every fix: the **no-signal control ranks above every strategy that actually
predicts something**, the maximum alpha t-statistic across 24 configurations is
**+1.06**, and the expected best Sharpe under *zero skill* at 500 trials is
**1.99** against a best real strategy of 1.04. ETH agrees: nothing passes.

Crucially, round 2 also built a **positive control** — a strategy with known,
injected predictive power — and confirmed the gate still passes it. So the
rejection is a finding, not a broken filter.

**Verdict: do not deploy capital.** The valuable output of this project is the
platform and the correct negative result — not a bot.

## The lesson that generalises furthest

> **Always run the ablation, and always run the positive control.** Delete the
> clever part and re-measure — if the result survives without it, the clever part
> was never doing the work. Then inject a known-good input and check your test
> still says yes — a filter that only ever says no is just as useless as one that
> only ever says yes, and far more flattering to your judgement.

This applies to every "does it work?" question in the business — a landing page
variant, an ad creative, an onboarding change, a prompt. Most measured "wins" are
the control wearing a costume, and the only way to find out is to build the
control and race it.

## The method we now use for any "is there an edge?" question

1. Establish the **base rate** before measuring skill.
2. Model **costs before signal** — compute the breakeven bar first; if it's
   implausible, stop.
3. **Walk forward** with purge and embargo. Never score on data used to choose.
4. **Count every trial** and deflate for it (DSR), plus PBO for selection risk.
5. Define the **gate in advance** and apply it mechanically.
6. **Run the no-signal ablation.** Delete the signal, keep the machinery. If the
   ablation wins, there is no signal.
7. **Test alpha, not return.** Regress on the benchmark; demand a t-statistic
   above 2.5. A high Sharpe with beta near 1 is the asset, not a strategy.
8. **Publish the sensitivity grid, not the best cell.** If the answer moves when
   you change an arbitrary setting, it is a choice, not a measurement.
9. Put an **adversarial critic** on the result whose job is to veto it — and
   act on what it finds, including when it kills the headline.
10. **Paper trade before funding.** Always.

## Guardrails adopted (extends [07 — Guardrails](./07-guardrails.md))

| # | Line | Why |
|---|---|---|
| 1 | No agent ever holds withdrawal permissions on an exchange or custody of private keys | An automated system with withdrawal rights is a single point of total loss |
| 2 | No capital deployed without a documented walk-forward result and explicit written sign-off | Stops a backtest becoming a bet |
| 3 | Paper trade ≥90 days before any funding | The only honest test of a cost model |
| 4 | UK retail: spot-only by default — FCA bans crypto derivatives for retail consumers | Perp venues sit outside UK consumer protection |
| 5 | Every disposal is a UK CGT event; a high-frequency bot creates a real tax and record-keeping burden | This is a cost, not an afterthought |
| 6 | The platform must be able to return "no edge" — and that is a successful outcome | A tool that can only say yes is not a measurement device |

## Status

| Phase | State |
|---|---|
| 0 — Evaluate the proposal | ✅ Complete |
| 1 — Research platform + critic review | ✅ Complete |
| 2 — Strategy to a verdict | ✅ Complete — **verdict is REJECT on every strategy, both assets** |
| 3 — Paper trading (90 days) | ⛔ Not reached — nothing cleared the gate to paper trade |
| 4 — Capital | ⛔ **Not recommended.** No strategy has measurable alpha |

## Open threads

- Which UK-accessible venue and fee tier? Every cost number depends on it (PRD Q2).
- Define "good" for the altcoin bot before building it (PRD Q3).
- Absolute return, or beat buy-and-hold BTC? These give opposite answers (PRD Q4).
- Is the recent-regime weakness decay, or a normal drawdown for this strategy class?
- Worth testing next: cross-sectional momentum across many coins (a real
  universe, not one survivor), and funding-rate carry — the two crypto anomalies
  with the most credible out-of-sample literature. Neither is a "direction bot".
