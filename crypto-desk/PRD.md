# PRD — Crypto Desk

**Status:** Phases 0–2 complete. Outcome: **do not deploy capital.**
**Owner:** Jonny (hello@shelle.uk)
**Date:** 2026-09-05
**Decision required:** Phase gate 1 (see §6). Nothing below phase 3 touches money.

---

## 1. Problem

A widely-shared post proposes turning $500 into a compounding crypto position via
three cooperating AI bots: a BTC direction predictor tuned to >50% accuracy over
2,000–5,000 simulations, an altcoin picker filtered on "fundamentals", and a
portfolio manager — all deployed on Base L2 "because fees are cheap".

The proposal is untested. Its headline metric (directional accuracy) is not a
measure of profitability, its search method is a known generator of false
positives, and its venue choice optimises the smallest cost term while ignoring
the largest. Acting on it directly would risk real capital on an unmeasured edge.

**The real problem to solve is not "build a bot". It is: does a directional
crypto edge exist that survives realistic costs at £1,000 of capital — and can we
tell the difference between an edge and a lucky search?**

Building a bot before answering that is how the £1,000 is lost.

## 2. Success criteria

Success is a *correct answer*, not a profitable backtest. A well-evidenced "no
edge, don't deploy" is a successful outcome of this project.

| # | Criterion | Measure | Status |
|---|---|---|---|
| S1 | Every claim in the source proposal is tested against real data | Numbers published, reproducible | ✅ done |
| S2 | Backtester cannot silently look ahead | Automated leakage tests pass | ✅ verified by critic |
| S3 | Costs are explicit, pessimistic and per-venue | Venue model with breakeven accuracy | ✅ done |
| S4 | Results are deflated for search intensity | DSR + PBO reported on every result | ✅ done |
| S5 | An independent expert critic reviews and can veto | Written adversarial review on file | ✅ **critic vetoed** |
| S6 | A strategy passes the full gate, or is honestly rejected | `verdict()` output | ✅ **rejected** |
| S7 | If deployed, paper trading precedes capital by ≥90 days | Live-vs-backtest tracking report | ⛔ not started |

**Profitability target (only meaningful if S1–S6 pass):** beat buy-and-hold BTC on
risk-adjusted return, net of costs, with max drawdown < 50%. If the strategy
cannot beat holding BTC after costs and tax, the correct action is to hold BTC or
hold cash — not to run a bot.

## 3. Scope

**In scope**
- Research platform: data integrity, leak-free features, cost model, backtester,
  walk-forward with purge/embargo, overfitting statistics, a hard funding gate.
- Evaluation of BTC directional strategies against those standards.
- A written, quantified evaluation of the source proposal.
- Paper-trading harness with live-vs-expected tracking.
- Documentation into the vault so the knowledge compounds.

**Out of scope for this phase**
- Any live order placement, wallet funding, or custody of keys.
- The altcoin "fundamentals" bot (see §7 Q3 — the premise needs defining before it
  can be tested; "good" is currently undefined).
- Multi-agent orchestration between bots. Three agents talking to each other does
  not create edge; it creates latency and failure modes. Deferred until a single
  strategy has a measured edge worth coordinating around.
- High-frequency / intrabar strategies. At retail latency and cost, this is a
  losing game against firms with colocated infrastructure.

**Explicitly excluded, permanently**
- Any action that spends money, changes a billing plan, or purchases anything.
  The build agent has no payment authority under any circumstance.
- Custody of private keys or exchange withdrawal permissions by any automated
  process.

## 4. Constraints

| Constraint | Detail | Consequence for design |
|---|---|---|
| Capital | £1,000 (~$1,300) | Fixed costs are material; minimum order sizes bind; risk of ruin is the dominant risk, not underperformance |
| Jurisdiction | UK retail | FCA banned crypto derivatives (incl. perps) for UK retail consumers. Offshore perp venues are outside that protection. Spot-only is the compliant default |
| Tax | UK CGT | Every disposal is a taxable event. A daily-flipping bot generates hundreds of disposals a year and a real record-keeping burden. This is a genuine cost, not a footnote |
| Shorting | Spot cannot short | A "direction" model's down-signal is only actionable as *move to cash*. This roughly halves the value of the signal on spot |
| Data | Single vendor, daily bars, BTC only | No intraday microstructure; vendor risk; single-asset conclusions |
| Agent authority | No payments, no key custody, no live trading without explicit written sign-off | Enforced in code and in this document |

## 5. Approach

Four principles, each a direct response to a failure mode in the source proposal:

1. **Optimise PnL after costs, never accuracy.** Accuracy is decoupled from
   profit when payoffs are asymmetric — and in BTC they always are.
2. **Count and deflate every trial.** The number of configurations searched is
   tracked and fed into the deflated Sharpe ratio. A search is only evidence if
   its intensity is priced in.
3. **Cost first, signal second.** Breakeven accuracy is computed per venue
   *before* any strategy work. If the required accuracy is implausible, the venue
   is rejected and no amount of modelling saves it.
4. **The platform must be able to say no.** The funding gate is defined in
   advance and applied mechanically, so the result is not a matter of opinion.

## 6. Plan and gates

| Phase | Work | Gate to pass | Money at risk |
|---|---|---|---|
| 0 ✅ | Evaluate the proposal against real data | Quantified verdict delivered | £0 |
| 1 ✅ | Research platform + walk-forward + critic review | Critic reviewed; leakage tests pass; four defects found and fixed | £0 |
| 2 ✅ | Strategy evaluation to a `FUNDABLE`/`REJECT` verdict | **REJECT on every strategy, both assets, every venue** | £0 |
| 3 ⛔ | Paper trading, ≥90 days, live data, real cost assumptions | Not reached — nothing cleared the gate | £0 |
| 4 | Capital deployment, staged | **Explicit written sign-off from Jonny.** Start at 10% of capital | £100 → staged |
| 5 | Scale on realised, not backtested, performance | Each step-up requires a fresh 60-day live window | staged |

**Phases 4 and 5 require a human to place every funding action.** The software
proposes; Jonny disposes. No automated system in this project will hold
withdrawal rights.

## 7. Open questions

| # | Question | Why it blocks | Needed from |
|---|---|---|---|
| Q1 | Is the £1,000 risk capital you can lose entirely without consequence? | Determines whether staged deployment is appropriate at all | Jonny |
| Q2 | Which venue can you actually access as a UK retail customer, and at what fee tier? | The whole cost model, and therefore the whole conclusion, hinges on this | Jonny |
| Q3 | For the altcoin bot: define "good". 2x in 6 months? Beats BTC? Survives a year? | Currently untestable as specified | Jonny |
| Q4 | Is the objective absolute return, or beating buy-and-hold BTC? | These give opposite answers about whether to trade at all | Jonny |
| Q5 | What drawdown makes you switch it off? | Must be set before deployment, not during | Jonny |
| Q6 | Time budget for monitoring? | An unmonitored bot with API keys is an operational risk, not an asset | Jonny |

## 8. Reversibility register

| Action | Reversible? | Control |
|---|---|---|
| Research, backtests, docs | Yes | Version control |
| Paper trading | Yes | No funds |
| Creating exchange API keys | Yes | Trade-only permission, **never withdrawal**; IP allowlist |
| Funding an account | Partially | Jonny performs manually; staged amounts |
| Placing live orders | **No** | Requires phase 4 sign-off; kill switch; hard daily loss limit |
| Losing the stack | **No** | Position sizing + vol targeting + max drawdown kill switch |

---

*Nothing in this document is financial advice. It is an engineering plan for
measuring whether a strategy has an edge.*
