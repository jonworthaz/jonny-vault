# Architect — Agent Creation Wizard

Turn an **objective** and/or a **job description** into a production-ready AI
agent — following best practices — without paying for anything beyond your
existing Claude/Copilot plan.

Architect is the generalisation of how [PackPro AI](../packaging-consultant-agent.md)
was built by hand: study the objective → suggest the right agent → decompose it
into capabilities and tasks → ask the clarifying questions a good build needs →
generate an optimised spec.

## What it does

A 6-step wizard:

1. **Objective / JD** — describe the goal or paste a job description. Architect
   scores it against a built-in library of agent archetypes and suggests the
   best fit (with a % match), lifting capabilities straight from the JD.
   The built-in library covers 19 archetypes: advisor/consultant, customer
   support, research, content, sales/outreach, ops/automation, compliance,
   data analyst, recruiting, coding, executive assistant, legal, finance,
   HR/people ops, project manager, social media, product manager,
   tutor/trainer and procurement.
2. **Identity** — name, one-line role, users, domain, and where it'll run
   (Copilot Studio / Claude / custom GPT).
3. **Capabilities & tasks** — auto-decomposed skills, each broken into the tasks
   it runs. Fully editable; reseed from the archetype or lift from the JD.
4. **Clarifying questions** — the gaps a good build needs closed. Answer what
   you can; blanks become up-front questions the agent asks (and questions Claude
   asks you when you run the Architect prompt).
5. **Best practices** — toggle proven patterns: output contract, ask-before-
   assuming, guardrails, knowledge grounding, worked examples, tools, evals,
   escalation.
6. **Review & generate** — three outputs:
   - **Agent spec** (markdown) — the deliverable: master prompt + a prompt per
     capability + guardrails + knowledge sources + deployment setup + eval cases.
   - **Architect prompt** — a filled-in master prompt to paste into **your own**
     Claude/Copilot so it interviews you and builds the final agent (no extra cost).
   - **Blueprint (JSON)** — save & re-open the exact build later.

## Best practices it bakes in

Clear role & scope · task decomposition · explicit method per capability ·
consistent output contract · ask-before-assuming · worked (few-shot) examples ·
knowledge grounding with citations · anti-fabrication guardrails · escalation
path · evaluation test cases · deployment-specific packaging.

## Running it

- **Just open `index.html`** in a browser — it's a single self-contained page.
- Or double-click `start-mac-linux.command` / `start-windows.bat` to serve it on
  `http://localhost:8011` (so clipboard & downloads work reliably).

Everything is **local-first**: your blueprint autosaves to this browser and
nothing is sent anywhere. No API key, no account, no server.

## The no-UI companion

Prefer to skip the wizard? [`agent-architect-prompt.md`](../agent-architect-prompt.md)
is the same brain as a single paste-ready master prompt — drop it into any
Claude/Copilot and answer its questions.
