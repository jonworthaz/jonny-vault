# Idea Board — Dashboard

An interactive, **single-file** dashboard for capturing and browsing ideas.
Each idea is a **card**; click it to see everything captured about it — the core
idea, why it's interesting, ways to build it, the cheapest path to a demo, open
questions, and the next step.

![idea board](./preview.svg)

## How to open it

It's one self-contained file with zero dependencies — nothing to install, no
server needed, nothing uploaded anywhere.

- **Just double-click `index.html`** — it opens straight in your browser.
- The launchers (`start-mac-linux.command` / `start-windows.bat`) are optional
  and only serve it on `http://localhost` if you prefer that.

> **Viewing it from GitHub:** GitHub shows the HTML *source*, not the rendered
> page. To see the dashboard, download `index.html` and open it, or enable
> GitHub Pages for a live link.

## What it does

- **Card grid** of every idea, with status pill and tags.
- **Search** across titles, tags and text.
- **Filter** by status (Raw / Exploring / Building / Parked / Shipped).
- **Detail view** (click a card) with the full write-up: build-approach table
  with effort levels, step-by-step demo path, open questions, next step.
- **Live stats** of how many ideas sit in each status.

## Adding or editing ideas

All content lives in the **`IDEAS`** list inside `index.html` (near the bottom,
in the `<script>` block). Copy an existing entry and change the fields:

```js
{
  id: "02",
  title: "Your idea",
  status: "raw",            // raw | exploring | building | parked | shipped
  tags: ["tag1", "tag2"],
  oneLiner: "One sentence summary.",
  coreIdea: "A paragraph explaining it.",
  whyInteresting: ["point", "point"],
  approaches: [
    { approach: "Name", medium: "Screen", how: "How it works", effort: "Low" },
  ],
  cheapestDemo: ["step 1", "step 2"],
  openQuestions: ["question?"],
  nextStep: "The single next action.",
  note: "Optional aside.",
}
```

Save, refresh the page, and the new card appears. Every field except `id`,
`title`, `status` and `oneLiner` is optional — leave any of them out and that
section simply won't render.

The root [`idea-board.md`](../idea-board.md) is a plain-text mirror of the same
content for reading on GitHub.
