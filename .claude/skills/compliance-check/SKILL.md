---
name: compliance-check
description: Lint any marketing copy, ad, landing-page text, email, or public claim against the project guardrails (doc 07) BEFORE it ships. Use whenever copy is being written, reviewed, or proposed for publishing. Blocks fake personas, fabricated/deepfake testimonials, false/absolute claims, and missing affiliate disclosures.
allowed-tools: Read, Bash(node *)
---

# Compliance check

Run every piece of outbound copy through the project's guardrails linter
(`engine/src/guardrails.ts`) before it is stored, approved, or published. This is
the mechanism that keeps us from repeating Medvi's mistakes
([07-guardrails.md](../../../07-guardrails.md)).

## How to check a piece of copy

From the repo root, run the linter on the text (exit code is non-zero on a block):

```bash
node --input-type=module -e 'import {lintCopy} from "./engine/src/guardrails.ts"; const r=lintCopy(process.argv[1]); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1)' "PASTE THE FULL COPY HERE (headline + body + cta + disclosure)"
```

- `pass: false` → **do not ship**. Each `[block]` note explains the violation; rewrite to remove it.
- `[warn]` notes don't block but must be eyeballed (scarcity must be literally true; superlatives must be substantiable; affiliate copy needs a clear `#ad` disclosure).

## The lines (summary of doc 07)

1. No fabricated experts/personas ("as a doctor", "board-certified", "Dr. …").
2. No fabricated or deepfaked testimonials/results ("before and after", fake reviews).
3. No absolute/unsubstantiated claims ("guaranteed", "100%", "cure", "FDA-approved", "risk-free").
4. Affiliate copy must disclose the paid relationship (`#ad` / "I earn a commission").
5. No dark patterns / false scarcity unless literally true.
6. No unverifiable superlatives ("the best", "#1").

## The decision rule

> Would this embarrass us in a screenshot? If yes, don't ship it.

If copy fails, rewrite and re-run until `pass: true`, then hand it on. Never
override a `[block]` — fix the copy instead.
