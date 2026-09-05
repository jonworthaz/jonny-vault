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

## What actually survived

Not a prediction model. A **risk-management shape**: time-series momentum,
volatility-targeted, with a no-trade buffer to suppress turnover. Its directional
accuracy is ~53% — *lower* than the claim it replaces — and it is profitable
anyway, because it sizes down into volatility and doesn't churn.

The overlays, not the signal, do the work. That is the opposite of where the
original plan spends its effort.

**Open concern:** the edge is concentrated in earlier regimes. See the report's
regime section before treating any of this as live-ready.

## The method we now use for any "is there an edge?" question

1. Establish the **base rate** before measuring skill.
2. Model **costs before signal** — compute the breakeven bar first; if it's
   implausible, stop.
3. **Walk forward** with purge and embargo. Never score on data used to choose.
4. **Count every trial** and deflate for it (DSR), plus PBO for selection risk.
5. Define the **gate in advance** and apply it mechanically.
6. Put an **adversarial critic** on the result whose job is to veto it.
7. **Paper trade before funding.** Always.

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
| 2 — Strategy to a verdict | ✅ Complete, with a live regime caveat |
| 3 — Paper trading (90 days) | ⛔ Not started — needs venue decision (PRD Q2) |
| 4 — Capital | ⛔ Blocked on phase 3 and written sign-off |

## Open threads

- Which UK-accessible venue and fee tier? Every cost number depends on it (PRD Q2).
- Define "good" for the altcoin bot before building it (PRD Q3).
- Absolute return, or beat buy-and-hold BTC? These give opposite answers (PRD Q4).
- Is the recent-regime weakness decay, or a normal drawdown for this strategy class?
