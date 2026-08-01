# Breathe & Chill

A self-contained, single-file **breathing & wellbeing** mini-app for the docked
Toggle module family. A calm launcher sits in the bottom-right corner; click it
to pop a compact, low-stimulation panel where you can follow a guided breathing
pattern with an animated orb, optional synthesised zen music and soft cue tones.

Everything lives in **`index.html`** — vanilla JS + HTML + CSS inline, **zero
external dependencies**: no CDNs, no fonts, no images, no audio files, no
network. The ambient pad and cue bells are generated live with the Web Audio
API. Fully offline.

Accent colour: soothing sky-blue `#38bdf8`. Ships with a soft dark base theme
and a light theme (persisted, day/night toggle).

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app — markup, styles and logic in one file. |
| `module.json` | Module manifest for the host superapp. |
| `README.md` | This document. |

---

## Breathing techniques

Each technique is **data-driven**: an ordered array of phases
`{label, secs, kind}`. The animation simply follows the phases, so adding or
tweaking a pattern needs no new animation code. The picker shows a one-line
benefit and the per-phase timing for each.

| Technique | Timing (seconds) | Benefit |
|-----------|------------------|---------|
| **Box breathing** | inhale 4 · hold 4 · exhale 4 · hold 4 | Focus & calm |
| **4-7-8 relaxing breath** | inhale 4 · hold 7 · exhale 8 | Unwind / sleep |
| **Coherent breathing** | inhale 5.5 · exhale 5.5 (no holds) | Balance / HRV (~5.5 breaths/min) |
| **Equal breathing** | inhale 4 · exhale 4 | Simple, beginner-friendly |
| **Extended exhale** | inhale 4 · exhale 6 | Calming (longer out-breath) |
| **Diaphragmatic (belly)** | inhale 4 · exhale 6 | Deep, grounding — breathe into the belly |
| **Pursed-lip** | inhale 2 (nose) · exhale 4 (pursed lips) | Eases breathlessness |
| **Physiological sigh** | inhale 3 · top-up 1 · exhale 7 | Fast stress reset (double inhale, long sigh) |

The physiological sigh is modelled as three phases — `inhale → top-up (short
second inhale on top) → long exhale` — matching the technique.

### 5-4-3-2-1 grounding

A short non-breathing calm alternative is included as a guided text card:
name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell,
1 you can taste. Good when breathing exercises aren't the right fit.

---

## The two visualisations

Toggle between them at the top of the session view.

1. **Expanding orb (default)** — a soft glowing circle drawn on a `<canvas>`.
   It scales **up** on inhale, **stays large** during a post-inhale hold,
   scales **down** on exhale, and **stays small** during a post-exhale hold.
   The top-up phase gives a small extra grow on top of an already-large orb.
   A ring/arc around the orb shows the current phase's countdown, the big phase
   label and a seconds countdown sit above it, and the colour shifts gently per
   phase (inhale sky-blue → hold indigo → exhale teal). Scaling uses an
   ease-in-out curve driven by `requestAnimationFrame`, matched to each phase's
   exact duration — no jarring jumps between phases.

2. **Box-path** — a glowing dot travels along the four sides of a rounded
   square, one side per phase, with a soft trail. Ideal for Box breathing; it
   also adapts to other patterns by walking the sides in order.

---

## Session controls

- Pick a technique (cards), choose a **duration** — 1 / 3 / 5 / 10 minutes, or a
  fixed number of **cycles** (3 or 5).
- **Start / Pause / Resume / Stop.** The panel shows the live cycle count and
  either the time remaining or "cycle N of M".
- A gentle end state — **"Nicely done 🌿"** — reports the number of cycles and
  the session length, with a "Breathe again" button.
- Minimising the panel mid-session pauses it (nothing runs unseen).
- Optional soft **haptic** buzz on each phase change via `navigator.vibrate`
  (guarded; mobile only — silently ignored where unsupported).

---

## Synthesised ambient audio (Web Audio API — no files)

All sound is generated at runtime. There are **no audio assets** of any kind.

- **Zen pad** — a slowly evolving calm drone: four detuned oscillators
  (sine + triangle) tuned to a root, fifth, octave and twelfth, each with its
  own gentle tremolo, run through a low-pass `BiquadFilter`. A slow (~0.05 Hz)
  sine **LFO** sweeps the filter cutoff so the texture keeps drifting and never
  feels static or looped. A **ConvolverNode** with a **procedurally-generated
  impulse response** (random noise shaped by an exponential decay curve) adds
  soft reverb. A volume slider controls the (deliberately soft) level; the pad
  fades in and out rather than clicking on/off.
- **Cue tones** — a soft sine "bell" with a short exponential envelope (plus a
  quiet upper partial) plays on each phase change, pitched per phase, routed
  through the same reverb. A two-note chime marks the end of a session.
- The `AudioContext` is created/resumed **only on a user gesture** (pressing
  Start, or ticking a music/cue toggle), per browser autoplay policy. Pad nodes
  are torn down on stop to free resources.
- If the browser has **no Web Audio support**, the entire audio control row is
  hidden gracefully and the rest of the app works unchanged.

---

## Safety note

Shown, unobtrusively, in the panel footer:

> **For relaxation only.** Stop if you feel dizzy or light-headed and breathe
> normally. Not a substitute for medical care. Don't practise while driving or
> in water.

---

## Persistence

The last technique, duration choice, chosen visualisation and music/cue/volume
preferences are saved to `localStorage` (`breathe:prefs:v1`). The day/night
theme is saved under `breathe:theme`.

---

## Module contract

Implements the shared Toggle module contract so a host superapp can drive the
widget, whether embedded as an iframe (via `postMessage`) or lifted onto the
same page (via `window.ToggleModules`).

**Outbound messages** — posted to the parent as
`{ source:"toggle-module", module:"breathe", type, … }`:

- `ready` — on load and on `ping` (includes `name`, `version`, `accent`)
- `open` / `close` — panel shown / minimised
- `change` — preferences changed
- `export` — snapshot payload in response to an `export` command

**Inbound host commands** — accepted as either `{type:"module:open"}` (namespaced)
or bare `{type:"open"}`:

- `open`, `close`
- `setTheme` with `{theme:"light"|"dark"}`
- `export`, `import` (import payload under `data`)
- `ping` (replies with `ready`)

**Same-page API** — registered at `window.ToggleModules["breathe"]`:

```js
{
  id:"breathe", name:"Breathe & Chill", version:"1.0", accent:"#38bdf8",
  open(), close(), setTheme(t), exportData(), importData(obj), on(cb)
}
```

A `CustomEvent("togglemodule:change")` is dispatched on `window` on every
preference change. `exportData()` returns
`{ module, version, exportedAt, data:{ prefs } }`; `importData()` tolerantly
accepts that wrapper or a bare prefs object.

**`module.json`:**

```json
{
  "id": "breathe",
  "name": "Breathe & Chill",
  "version": "1.0",
  "accent": "#38bdf8",
  "entry": "index.html",
  "capabilities": ["open", "close", "setTheme"],
  "messageNamespace": "toggle-module"
}
```

---

## Layout & sizing

Shares the markup-dock shell: a bottom-right FAB, a click-through page
(`html,body{pointer-events:none}` with `.br-overlay > *{pointer-events:auto}`)
so you can keep using whatever is behind it, and a minimise (▾) control.

- **Small launcher** by default.
- **Maximise (⤢)** grows the panel to roughly `min(760px, 94vw) ×
  min(640px, 90vh)` and lays the technique cards out in two columns.
- Opening with **`?full=1`** starts expanded.

Ids are namespaced `br*` and classes `br-*` so the module can coexist with
sibling Toggle modules on one page.

---

## Limits

- **Web Audio needs a user gesture.** The ambient pad and cue tones can only
  start after you press Start or tick a toggle — browsers block audio before
  the first interaction.
- **Haptics are mobile-only.** `navigator.vibrate` is a no-op (or absent) on
  desktop browsers; it is always guarded.
- The breathing timings run on `requestAnimationFrame`; if a background tab
  throttles rAF the animation pauses with the tab — expected browser behaviour.
- This is a wellbeing/relaxation aid, not a medical device (see safety note).
