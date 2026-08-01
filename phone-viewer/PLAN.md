# Phone Viewer & Controller — Research, Evaluation & Build Plan

> **A docked mini-app module that mirrors and fully controls your phone from the
> desktop:** live screen, mouse control, keyboard input, audio moved to the PC,
> and drag-and-drop files both ways. Built **on the PC** (this is a desktop app,
> not a phone app). Fits the Super App as another corner dock module.
>
> This is a planning/spec doc to move to the PC and build there — the mirroring
> engine needs native/USB access that a hosted static web page cannot provide.

---

## 1. Reality check (read this first)

Mirroring + controlling a phone is **not something a plain hosted web page can
do** — it needs low-level device access (USB/ADB, screen capture, input
injection, audio capture). What *is* achievable, and how hard:

| Capability | Android (USB) | Android (Wi-Fi) | iPhone | Bluetooth |
|---|---|---|---|---|
| Live screen mirror | ✅ scrcpy / ADB | ✅ (adb tcpip) | ⚠️ view-only, hard | ❌ |
| Full mouse/touch control | ✅ | ✅ | ❌ (Apple blocks input injection) | ❌ |
| Keyboard input | ✅ | ✅ | ❌ | ❌ |
| **Audio to PC** | ✅ scrcpy ≥2.0 (Android 11+) | ✅ | ❌ | (audio only, not control) |
| Drag-drop file transfer | ✅ adb push/pull | ✅ | ⚠️ limited (AFC, photos only) | ❌ (too slow/limited) |
| Zero-driver "just works" | ⚠️ needs USB debugging on once | ⚠️ same + pairing | ❌ | ❌ |

**Verdict:** target **Android via `scrcpy`** (USB first, Wi-Fi as a bonus). It is
the only path that delivers *all* of the requested features (screen + control +
**audio** + files) reliably and free. **iPhone cannot be fully controlled** from
a PC — Apple prohibits input injection; the best possible is a read-only AirPlay
mirror (e.g. via a receiver), no control. **Bluetooth cannot mirror/control a
screen** — its bandwidth/profiles don't support it. Set these expectations in
the UI so it never feels broken.

### The engine: scrcpy
[`scrcpy`](https://github.com/Genymobile/scrcpy) (by Genymobile) is the mature,
free, open-source engine that already does exactly this: pushes a tiny server to
the phone over ADB, streams H.264/H.265 video + audio back, and injects
touch/key events. It needs **no app installed on the phone** and **no root** —
only "USB debugging" toggled on once. Our app is essentially a **friendly,
docked front-end + onboarding wrapper around scrcpy** (or its protocol).

---

## 2. Recommended architecture (build on the PC)

Two viable routes. **Route A (native wrapper) is recommended** for "seamless,
works out of the box, audio + files + control." Route B (pure browser) is
lighter and installs nothing, but can't do system audio or true drag-drop as
cleanly.

### Route A — Native desktop app wrapping scrcpy  ✅ recommended
A small **Tauri** (Rust + web UI) or **Electron** (Node + web UI) desktop app.
The web UI reuses our **dock module shell** (same look/feel as the other mini
apps); the native side runs `adb` + `scrcpy` and pipes the window/stream in.

```
┌────────────────────────── Desktop app (Tauri/Electron) ──────────────────────┐
│  Web UI (dock module shell)                                                   │
│   • Connect screen · device list · big "Mirror" button                        │
│   • Toolbar: rotate, volume, back/home/recents, screenshot, file drop zone    │
│   • Status: connected / unauthorised / no-device                              │
│                    ▲ IPC (commands + events)                                  │
│  Native core (Rust/Node)                                                       │
│   • bundles adb + scrcpy binaries (Win/Mac/Linux)                             │
│   • device discovery (adb track-devices), auth prompt handling                │
│   • launches scrcpy (screen+audio+control) — embed its window OR use its       │
│     server protocol and render the H.264 stream in a <video>/WebCodecs        │
│   • file transfer: adb push/pull wired to HTML5 drag-and-drop                  │
│   • Wi-Fi: `adb tcpip 5555` + `adb connect <ip>` one-click                     │
└───────────────────────────────────────────────────────────────────────────────┘
```
Two ways to get the picture on screen:
1. **Embed scrcpy's own window** (simplest, rock-solid): launch scrcpy as a child
   process; on Windows re-parent its window into the app frame (or just launch it
   borderless docked). Fast to build; audio+control+files all "just work."
2. **Speak scrcpy's protocol** yourself: push `scrcpy-server.jar`, open the ADB
   sockets, **decode H.264 with WebCodecs `VideoDecoder`**, send control
   messages. More work, but gives a fully in-app canvas you can style and dock.

> Start with **(1)** to ship fast, migrate hot paths to **(2)** if you want the
> stream fully inside the dock panel.

### Route B — Pure browser app (WebUSB + ADB)  ⚠️ lighter, limited
Chrome/Edge only. Use **[ya-webadb / "Tango"](https://github.com/yume-chan/ya-webadb)**
(`@yume-chan/adb` + `@yume-chan/scrcpy`): talk ADB straight from the browser over
**WebUSB**, push the scrcpy server, decode video with **WebCodecs**, inject
control. No install, runs from a page.
- ✅ screen mirror, mouse, keyboard, file push/pull, USB (and Wi-Fi via ADB TCP).
- ❌ **desktop system audio** is unreliable/absent (scrcpy audio in-browser is
  immature); WebUSB is **Chromium-only** and blocked inside cross-origin iframes
  unless `allow="usb"` is granted — so it can't just live inside our hosted
  superapp iframe without host cooperation.
- Good for a "view + control, no install" tier; not for the full audio+files
  promise.

**Decision:** ship **Route A** as the product; optionally offer Route B as a
"no-install, USB, Chrome" fallback that reuses the same UI.

---

## 3. UX principles (seamless, minimal, accessible)

The brief: *no complex menus, works out of the box, minimal setup.* Design to that.

- **One screen, one primary action.** Big **“Mirror my phone”** button. Below it,
  live status in plain English: *“Plug your phone in with a USB cable”* →
  *“Allow USB debugging on your phone”* (with a 5s gif) → *“Connected — here's
  your phone.”*
- **Auto-detect & auto-connect.** Watch for devices; the moment one is authorised,
  start mirroring — no dropdowns to hunt through. Remember the device.
- **First-run helper only when needed.** If USB debugging is off, show a single
  guided card (Settings → About → tap Build number 7× → Developer options → USB
  debugging). Never show it again once done.
- **Wireless in one tap** *after* first USB pair: a “Go wireless” button runs
  `adb tcpip` + `adb connect` and remembers the IP so next time it's cable-free.
- **Controls are obvious icons**, not menus: back / home / recents, volume ±,
  rotate, screenshot, and a **file drop zone** (“drop files here to send to phone;
  drag from the phone list to save to PC”).
- **Fails gracefully & honestly:** iPhone → “Live control isn't possible on
  iPhone — showing a mirror only” (or hide control). No device → the plug-in
  prompt. Unauthorised → the allow-on-phone prompt.
- **Accessibility:** full keyboard control of the phone; large hit targets;
  screen-reader labels; respects the app's day/night theme; scalable text.

---

## 4. Feature → implementation map

| Feature | How |
|---|---|
| Live screen | scrcpy video (H.264/H.265). Route A: embed window or WebCodecs canvas. |
| Mouse control | Map canvas pointer x/y → scrcpy inject-touch control messages. |
| Keyboard | Capture keydown → scrcpy inject-key (and clipboard sync for paste). |
| **Audio → PC** | `scrcpy --audio` (Android 11+). Route A only (reliable). |
| Drag files **to** phone | HTML5 drop → `adb push <tmp> /sdcard/Download/`. |
| Drag files **from** phone | Browse `adb shell ls` / pull → drag out or “Save to PC”. |
| Rotate / nav / volume | scrcpy control messages / `adb shell input`. |
| Screenshot / record | `adb exec-out screencap` / scrcpy `--record`. |
| Wireless | `adb tcpip 5555` then `adb connect <ip>:5555`; mDNS to find IP. |
| Multiple phones | device list; default to the last used. |

---

## 5. Tech stack (PC build)

- **Shell:** **Tauri** (Rust core, tiny binaries, secure) *recommended*, or
  **Electron** (faster to prototype, larger). Web UI = HTML/CSS/JS reusing the
  dock module shell for a consistent look.
- **Engine:** bundle `scrcpy` + `adb` (platform-tools) for Win/macOS/Linux, or
  vendor `scrcpy-server.jar` and drive the protocol directly.
- **Video (Route B / protocol path):** WebCodecs `VideoDecoder` → `<canvas>`.
- **Libraries (if going protocol-direct or browser):** `@yume-chan/adb`,
  `@yume-chan/scrcpy`, `@yume-chan/scrcpy-decoder-webcodecs`.
- **Packaging:** signed installers (MSI/EXE, DMG, AppImage). Bundle binaries so
  the user installs **nothing** else.

---

## 6. Milestones

1. **M0 – Spike (½–1 day):** run `adb devices` + `scrcpy` from the app; prove
   mirror+control+audio on one Android over USB.
2. **M1 – Connect flow:** device auto-detect, auth handling, the guided
   USB-debugging card, “Mirror” button. Embedded scrcpy window (Route A #1).
3. **M2 – Dock module shell:** wrap it in the corner-dock UI (matches Super App),
   day/night, status states, primary-action screen.
4. **M3 – Files:** drag-drop to phone (push) and from phone (pull) with progress.
5. **M4 – Wireless:** one-tap `tcpip`+`connect`, remembered IP, mDNS discovery.
6. **M5 – In-panel stream (optional):** move from embedded window to WebCodecs
   canvas inside the dock for full styling/embedding.
7. **M6 – Polish:** keyboard/clipboard sync, screenshot/record, error copy,
   installers, auto-update, code signing.
8. **M7 – iPhone tier (optional):** read-only AirPlay mirror; clearly “view only.”

---

## 7. Risks & mitigations

- **USB debugging friction** → best-in-class guided first-run; remember the
  device; push hard on the one-tap wireless follow-up.
- **Per-OEM quirks** (Xiaomi/Huawei need “USB debugging (Security settings)”) →
  detect common failures and show OEM-specific tips.
- **Audio needs Android 11+** → feature-detect; degrade to video+control with a
  small note on older phones.
- **iPhone expectations** → state the limitation up front; never pretend to
  control iOS.
- **Bundling binaries / licensing** → scrcpy is Apache-2.0, platform-tools are
  redistributable; keep attributions.
- **Security** → all local (USB/LAN); no cloud. Make that explicit; scope ADB to
  the connected device; clear the authorised key on “forget device.”

---

## 8. How it fits the Super App

Same **dock module contract** as the other mini apps: a bottom-right launcher
opens the phone panel; it exposes `open/close/setTheme`; “export/import” isn't
meaningful here (there's no document), so it advertises only the control
capabilities. In the browser superapp it appears as a **module card that
launches the desktop app** (or, for the Route B tier, opens the WebUSB view in a
top-level Chrome tab — WebUSB is blocked in cross-origin iframes). The native
desktop build is the real product; the web dock is the launcher/marketing shell.

---

## 9. Do-this-on-the-PC checklist

1. Install prerequisites: Node (Electron) **or** Rust + Node (Tauri), and Android
   `platform-tools` (adb) + `scrcpy` on PATH for the spike.
2. `git`-init a `phone-viewer` app; scaffold Tauri (`npm create tauri-app`) or
   Electron.
3. **Spike:** from the app, shell out to `scrcpy` and confirm mirror + control +
   `--audio` on your Android over USB.
4. Build the connect flow + guided USB-debugging card (§3).
5. Drop the web UI into the shared **dock module shell** (copy from
   `markup-dock/`), wire day/night + status states.
6. Add file drag-drop (adb push/pull) and one-tap wireless.
7. Bundle `adb` + `scrcpy` binaries so end users install nothing; sign & package.
8. (Optional) Swap the embedded window for a WebCodecs in-panel canvas.

---

### TL;DR
Target **Android + scrcpy**, build a small **Tauri/Electron desktop app** that
wraps it behind our **dock module shell**, obsess over the **one-button,
guided-first-run** experience, add **file drag-drop** and **one-tap wireless**,
and be **honest that iPhone/Bluetooth full control isn't possible**. That
delivers the seamless “view + fully control your phone from the desktop, with
sound and files” product the brief asks for.
