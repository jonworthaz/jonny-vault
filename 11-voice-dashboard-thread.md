# 11 — Voice Dashboard: Investigation Thread

**Status:** Open thread — pending the actual dashboard file
**Filed:** 25 July 2026 · **Vault owner:** Jonny
**Living document** — session feedback and verification evidence get folded in below.

---

## What this is

A local, browser-based dashboard file that reportedly:

- Runs in the browser, with microphone access
- Enables active, spoken conversation with a designated agent
- Lets that agent take actions
- Is claimed to run on **plan usage, not the Anthropic API**

Distinct from (and not to be confused with):
1. **Home Assistant Anthropic integration** — continuous/wake-word but API-keyed. Not this.
2. **Native Claude desktop voice mode** — plan-based but turn-based, and doesn't expose the
   full Cowork/Code surface by voice. Not this either.

## The goal (what "good" looks like)

One local system delivering **all** of: continuous voice · plan usage (no API key) ·
full app capability (drive Cowork/Code, not a chat wrapper) · an agent that executes.
That combination is the claim to verify — not assume, in either direction.

---

## Verification log

### 25 Jul 2026 — repo swept; the dashboard file is NOT in the vault

Checked, with negative results:

- **`shelle-os/index.html`** (the newest hub, main `22ec720`) — a **static links page**:
  hero for the Agent Wizard, quick-launch tiles, tool links. **Zero** JavaScript
  voice/mic/network code. It is not the voice dashboard.
- **Every `.html`/`.js` on `main` and the working branch** grep-swept for
  `getUserMedia · SpeechRecognition · speechSynthesis · MediaRecorder · AudioContext ·
  api key · anthropic · claude.ai · WebSocket/wss · Authorization/Bearer` — **no hits
  anywhere**. Nothing in this repository talks to Claude or touches a microphone.

**Conclusion so far:** the dashboard file lives outside this repo (most likely a file a
Claude session wrote to the local machine, or a page published as a claude.ai Artifact).
**Blocking input:** the file itself — drop it into the repo (or paste it, tokens
redacted) and the checklist below gets closed properly.

### Architecture candidates (pre-answered from first principles)

For "browser + mic + Claude on **plan, not API**", there are only a few wirings that
actually work — each with different answers to the checklist:

| # | Wiring | Plan or API? | Actions execute where? | Voice | Fragility |
|---|---|---|---|---|---|
| **A** | **claude.ai Artifact** using the artifact runtime (`window.claude.*`) — page hosted/viewed on claude.ai | **Plan** ✅ (viewer's plan) | Inside the page's own JS only — **cannot drive Cowork/Code** | Turn-based (Web Speech API) | Artifact runtime contract changes |
| **B** | Local page + **local bridge to Claude Code** (plan OAuth) — small local server the page fetches | **Plan** ✅ (Code's login) | **Real tools** — files, bash, MCP: Code's surface, not Cowork's UI | Turn-based | Bridge process + CLI auth/session expiry |
| **C** | Page rides the **browser's claude.ai session cookie** | Plan, but **CORS blocks this** from a local file without an extension/userscript | Internal endpoints | — | Very fragile + ToS-grey |
| **D** | **API key under a voice UI** despite the claim | **API** ❌ | The page's own tool wiring | Turn-based | Stable but fails the premise |

Two useful hard facts regardless of which it is:

1. **"Continuous" will be turn-based under the hood.** Browser voice = Web Speech API /
   MediaRecorder chunks: listen → send → speak. Good engineering can make that *feel*
   continuous (auto-restart listening, barge-in mute), but full-duplex it is not. The
   doc's skepticism #3 can be pre-answered: *turn-based, possibly well-disguised* —
   unless the file reveals a genuine streaming transport.
2. **"Full app capability" and "plan, not API" pull against each other.** The plan-based
   paths are A (page-sandboxed, no app driving) and B (Code's tool surface — powerful,
   but that's "actions via Code", not "driving Cowork by voice"). If the file claims
   all three simultaneously, scrutinise the auth call hardest.

### Checklist (ticked as evidence lands)

- [ ] Setup asks for an **API key** vs relies on an existing login?
- [ ] Where is the **connection/auth call** in the file?
- [ ] Actions happen **inside a Claude app** or via the dashboard's **own tools**?
- [ ] Transport: **session/cookie · local bridge · artifact runtime · API**?
- [ ] **Continuous or turn-based** under the hood?
- [x] ~~Is it in the vault repo?~~ **No — swept 25 Jul 2026; see log above.**
- [ ] What breaks it (app updates? session expiry?) — durability + ToS position?

## Objectives once verified

1. Document the actual wiring (transport, auth, action path) in plain terms.
2. Name the **load-bearing dependency** and its failure mode.
3. Decide what's safe to build on top vs. too fragile.
4. Map it to existing work — the vault, Claude Ideas' agent loop (`claude-ideas/AGENT.md`),
   Forge, and the repo's Claude Code agents.

If it turns out API-backed under a voice UI: still a keeper as a local setup — but the
"plan not API" objective is **not met**, and this file says so plainly.

## Feedback loop

Session feedback gets folded in here — what the agent handled well, where turn-taking
friction showed, breakage events. Append dated entries to the **Verification log**.

---

*Open thread, not a conclusion. Next action: obtain the dashboard file (redact any
tokens) and close the checklist against its actual code.*
