# Idea Board

*A running capture of raw ideas. No filtering at this stage — get it down, flesh
it out enough to judge later, promote the good ones into their own doc.*

> 📊 **Interactive dashboard:** open [`idea-board/index.html`](./idea-board/index.html)
> in a browser for a searchable, filterable card view of these ideas. Add or edit
> ideas in [`idea-board/ideas.js`](./idea-board/ideas.js). This markdown file is
> the plain-text mirror.

| # | Idea | One-liner | Status |
|---|---|---|---|
| 01 | [3D Layered Images](#01--3d-layered-images) | Images with depth that appear to move as you walk past | 💡 Raw |

---

## 01 — 3D Layered Images

> Images that have **layers** and which **seem to move when walking past** —
> depth and motion from a flat (or near-flat) picture, no glasses, no screen
> required.

### The core idea

Split an image into depth layers (foreground / midground / background) and
present them so that the viewer's *changing angle* — from walking past, or
tilting a phone — reveals **parallax**: near layers shift more than far ones.
The brain reads that relative motion as genuine 3D depth.

### Why it's interesting

- Works without 3D glasses or a headset.
- The "wow" moment is involuntary — people stop and move side to side.
- Maps onto things people already buy: posters, album art, signage, shopfronts,
  greetings cards, NFTs/digital collectibles, museum/gallery pieces.

### Ways to actually build it

| Approach | Medium | How it works | Effort |
|---|---|---|---|
| **Lenticular print** | Physical | Ridged lens sheet over interlaced layered image; angle selects which slice you see | Low–med (print houses exist) |
| **Parallax / "depthy" web** | Screen | Layers as PNGs with depth; move on scroll, mouse, or **device gyroscope** | Low (JS libs) |
| **Depth-map 2D→3D** | Screen | One photo + AI-generated depth map → fake parallax on motion | Med (AI does the layering) |
| **Light-field / holographic display** | Hardware | True multi-view (Looking Glass etc.) — real depth from any angle | High (specialist HW) |
| **Layered physical "shadow box"** | Physical | Real cut layers spaced apart in a frame; parallax is genuine | Med (craft / laser-cut) |

### Cheapest path to a demo

1. Take or generate an image.
2. Auto-generate a **depth map** (AI), or hand-cut 3 layers in any editor.
3. Drop the layers into a parallax viewer that responds to the **phone's
   gyroscope** / cursor position.
4. Ship as a web page → instant "walk past and it moves" on mobile.

> This repo already has an in-browser image tool (`image-annotator/`) — a
> zero-dependency, runs-locally pattern that the same approach could reuse for a
> "layer + parallax" web demo.

### Open questions

- Physical product (lenticular / shadow box) or digital (web / display)?
- Is the value the **effect** (sell prints) or the **tool** (let anyone turn a
  photo into a layered 3D image)?
- Single hero use case to nail first: posters? shopfront signage? phone
  wallpapers? gift cards?

### Next step

Build the cheapest demo above, look at it on a phone, *then* decide which
direction is worth more than an afternoon.
