# Quick Summary

A self-contained, single-file corner-docked **text summariser** — part of the Toggle
mini-app family (shares the `markup-dock` shell). Paste or drop text, pick a length,
and get an extractive summary, key points, and stats. The built-in summariser runs
**fully offline** in pure JavaScript with **zero external dependencies**. An optional,
user-triggered local-AI path is the only thing that ever touches the network.

- **One file:** `index.html` (HTML + CSS + JS inline). No CDNs, no web fonts, no libraries.
- **Accent:** violet `#8b5cf6`. Dark base + light theme (persisted to `localStorage`).
- **Docked:** bottom-right launcher (FAB); click to pop a compact panel; **▾** minimises.
  The page behind stays click-through. **⤢** maximises to `min(920px,96vw) × min(680px,90vh)`.
  Open with `?full=1` to start expanded.

## Using it

1. **Input** — paste into the big textarea, click **📋 Paste** (clipboard read, guarded),
   **⬆ File**, or **drag & drop** a text file onto the input. Supported text types are read
   with `FileReader.readAsText`: `.txt`, `.md`, `.markdown`, `.csv`, `.log`, `.json`.
   A live **word / character count** updates as you type. **✕ Clear** empties the box.
2. **Length** — **Short / Medium / Long** presets target roughly **10% / 25% / 40%** of the
   document's sentences (minimum 1, capped at the sentence total). The **slider** overrides
   the preset with an **exact sentence count**; its label shows `N of M sentences · ~P%`.
3. **Summarise** — produces the summary (sentences in original order), a **Key points** row
   of top keywords/keyphrases, and **stats**: words in → out, **compression %**, and
   **reading time** in → out (≈200 wpm).
4. **Output** — **⧉ Copy** (Clipboard API with an `execCommand` fallback), **↓ .txt** and
   **↓ .md** downloads. A pill labels the source: **Local (offline)** or **Local AI**.

## The offline extractive method (what it does, and its limits)

The built-in summariser is **extractive**, not abstractive: it **selects and reuses whole
sentences** from your text — it never paraphrases or writes new prose. Pipeline:

1. **Sentence splitting** — splits on `.`, `!`, `?`, ellipses and newlines, and merges back
   across a built-in list of common abbreviations (Mr., e.g., Inc., Jan., …) so they don't
   cut a sentence short. Good enough for everyday prose; not a full NLP sentence tokeniser.
2. **Tokenise & clean** — lowercase word tokens, with a built-in English **stopword** list
   removed and 1-character tokens dropped.
3. **Score** — **word-frequency / TF weighting**: each sentence's score is the sum of its
   words' document frequencies (normalised to the most frequent word), **divided by
   `√(word count)`** for length normalisation, with a **small lead-position boost** for
   early sentences and a penalty for very short fragments.
4. **Select** — take the top-scoring sentences for the chosen length and **emit them in their
   original order** so the summary reads naturally.
5. **Key points** — top non-stopword **unigrams plus frequent bigrams** (adjacent
   non-stopwords), de-duplicated so a phrase and its component words don't both appear.

**Limits:** extractive summaries can only be as good as the source sentences; they won't
condense across sentences, resolve pronouns, or rephrase. Frequency scoring favours
on-topic, information-dense sentences but can miss nuance, sarcasm, or narrative structure.
Very short inputs (≤ target sentences) are returned whole. It's tuned for English.

## Optional local AI (off by default)

The **Use local AI** toggle is off by default and **AI is never called automatically** —
only on an explicit action (checking the box, **Test connection**, or **Summarise** with the
toggle on). Availability is detected in this order:

1. **Host bridge** — if the host page exposes `window.ToggleAI` with a
   `summarise(text, { length }) → Promise<string>` method, that is used. This is the
   preferred integration when Quick Summary is embedded in a larger app that already has an
   LLM.
2. **Local LLM endpoint (Ollama-style)** — otherwise it can call a configurable endpoint,
   default `http://localhost:11434/api/generate` with model `llama3.2` (both editable under
   **AI options**). Availability is checked with a guarded `GET …/api/tags`; generation POSTs
   `{ model, prompt, stream:false }` and reads `response`.

If no AI is reachable the toggle reverts and shows: **"No local AI detected — using the
built-in summariser."** Every AI call is wrapped in `try/catch` with a visible error and an
**automatic fallback to the offline summariser** — AI output is never invented.

### CORS / mixed-content caveat

A page served over **https** calling **http://localhost** is **mixed content** and browsers
may block it; and a browser page calling Ollama cross-origin needs Ollama's **CORS** to allow
the page's origin (e.g. run Ollama with `OLLAMA_ORIGINS="*"` or your specific origin). A
**Chromium**-based browser is the most reliable for the localhost path. If the endpoint is
unreachable for any reason, Quick Summary silently falls back to the offline summariser.

## Module contract

Uniform with the other Toggle modules, so a host superapp can drive it.

- **Posts to parent** (`window.parent.postMessage`) with
  `{ source:"toggle-module", module:"quick-summary", type:… }` for `ready`, `open`, `close`,
  `change`, and `export`.
- **Accepts host commands** as either `{type:"module:xxx"}` or bare `{type:"xxx"}`:
  `open`, `close`, `setTheme{theme}`, `ping`, `export`, `import{data}`.
- **Same-page API:** registers `window.ToggleModules["quick-summary"]` =
  `{ id, name, version, accent, open(), close(), setTheme(t), exportData(), importData(obj), on(cb) }`,
  and dispatches a `CustomEvent("togglemodule:change")` on every change.
- **`module.json`:**
  `{ id, name, version, accent, entry, capabilities:["open","close","setTheme","export","import"], messageNamespace:"toggle-module" }`.

### Export / import

Export/import persist **preferences only** (kept minimal): summary `mode`, exact sentence
count, the `useAI` intent, and the last `endpoint` / `model`. The `⤓` / `⤒` header buttons
save/load these as JSON. Your **input text and summaries are never stored** — nothing about
the content you summarise is persisted or transmitted (except, if you opt in, to your own
local AI endpoint).

## Files

- `index.html` — the whole module (markup + inline CSS + inline JS).
- `module.json` — module manifest.
- `README.md` — this file.
