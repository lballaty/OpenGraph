# Changelog

The **This build** line in Settings → About is a hash of the file's own contents.
Two copies showing the same one are the same file. Use it to tell builds apart —
the version number alone will not, since several ship on the same date.

## 3.1.5 — 2026-08-29 · build `918dd604`

Diagnostics, so a problem report is one paste rather than a conversation.

- **An environment block is logged at startup**: build, full address, whether the
  page is framed or installed, which storage backend is in use and whether
  `window.storage` and `localStorage` each work, persistence status, quota and
  usage, capability checks, screen and locale, and the state the drawing came up
  in. Deliberately cheap — counts and checks only, no per-key reads, since that
  is what tripped the host rate limit.
- **Every storage call is wrapped**, so a failed get, set, delete or list is
  logged with the operation, the key and the size. Failures only; logging
  successes would bury the log and, on a rate-limited host, make it worse. All
  66 call sites go through it.
- **Copy details now includes the log** and is renamed accordingly. Copying a
  summary and then being asked for the log separately was the round trip this
  removes.

## 3.1.4 — 2026-08-29 · build `59283de3`

- **The log banner now names the address and the storage backend exactly.** It
  said "unknown · storage available", which was too vague to tell where a log
  came from: an empty `location.host` means an opaque origin — a sandboxed frame
  or a preview — and that read identically to a failure to detect the host. It
  now prints the full URL, or says plainly that the origin is opaque and whether
  the page is inside a frame.
- The backend is named too: `browser`, `host` or `memory`. A rate-limited host
  bridge and ordinary `localStorage` behave very differently and were both
  reported as "available".
- **About gains an Address row** showing the same thing.

## 3.1.3 — 2026-08-29 · build `54cd0b8d`

- **A drawings export made by an affected build now recovers what was in it.**
  Those exports contain the symbol sets and templates the old migration misfiled,
  still under names like `lib:Architectural`. They were skipped as "not a
  drawing", which threw away the only surviving copy. The name says exactly where
  each belongs, so they are put back instead. Internal keys swept up at the same
  time (`auto`, `log`, `stats`, `tabs`, `howlearn`) are now ignored quietly rather
  than warned about.
- **Rate-limited storage is handled.** Some hosts limit the number of storage
  calls rather than the space. The startup inventory used to read every key just
  to report a size, which was enough on its own to trip the limit and make the
  listing fail; it now only counts. The repair pass stops cleanly when limited,
  says so, and continues on the next launch, since it deletes as it goes.
- Rate-limit errors are named separately from "storage is full" — the remedy is
  to reload, not to delete anything.

## 3.1.2 — 2026-08-29 · build `02372c2f`

- The "No templates yet" message now names the setup-file route, which it did not
  mention at all — the one case where someone has nine templates sitting in a file
  and no idea the app can take them.

## 3.1.1 — 2026-08-29 · build `56df1b7c`

**Fixes data loss. Update before doing anything else.**

### The bug

The one-time migration of pre-namespace drawing keys was written when `dg:doc:`
and `dg:ui` were the only reserved keys. It moved every other `dg:` key into the
drawings area and deleted the original. Everything added since looked to it like
an old drawing: templates, symbol sets, autosave, the activity log, usage stats,
the tab heartbeat, the help learning.

The effect was that a setup restored successfully was destroyed on the next
launch. Nine symbol sets became nine "drawings" that could not be opened, and
the drawings export scooped up two dozen things that were never drawings.

### The fix

- The migration now works from an **explicit allow-list** of reserved keys and
  prefixes, and additionally requires a value to parse as a drawing before it
  will touch it. A key it does not recognise is left alone by default rather
  than destroyed by default.
- A **repair pass** runs once on launch and puts misfiled symbol sets, templates,
  autosave, log, stats and learning data back where they belong. Nothing was
  lost — it was misfiled — so the repair restores it intact. It will not
  overwrite anything already correctly filed.
- **Setup import writes are individually guarded.** A single failed write used to
  throw out of the loop and silently lose every remaining item. It now continues,
  names what failed, and calls out a full-storage error specifically.
- **Partial restores are reported.** "Restored 3 of 9 symbol sets" rather than a
  success message that hides the shortfall.
- **A storage inventory is logged** at launch and after each import, naming every
  set and template present and the total size.

## 3.1 — 2026-08-29 · build `26005f70`

### Tools
- **Resize** (`Shift+S`) — by factor, or to a target width or height. Uniform
  only, so circles stay circles. Stroke weights are not scaled.
- **Offset** (`Shift+O`) — parallel copy at a distance, outward or inward, with
  mitre joins.
- **Trim** (`Shift+T`), **Extend** (`Shift+E`), **Break** (`Shift+K`) — cut back
  to the nearest crossings, lengthen to the next thing met, cut in two anywhere.
- **Board** (`Shift+B`) — board outline at an exact size with a hole pattern
  (corners, six, Pi HAT, Uno shield, Eurocard, 25 mm grid).
- **Close/open** now works on a finished polyline, and inside groups.

### Files
- **DXF export** (R12). Geometry, layers, colours, dashes, text, arcs. Reports
  what it cannot carry.
- **ZIP import** — a folder of SVGs becomes a symbol set. No dependency; uses
  the browser's DecompressionStream.
- **Layer export and import** — move one layer between drawings.
- **Compatibility checking on every route in.** Malformed entities are dropped
  with the position, type and reason in the log, rather than loading and
  misbehaving later. Templates get a three-tier gate: refused, asked about, or
  merely mentioned.

### Help
- **Version is visible** at the foot of the Ask panel — name, version, build hash
  and whether storage is working. Tapping it opens About.
- **Ask panel** — floating and non-blocking, so it can be read while following
  its own steps. Plain-language search over 48 tasks, 69 button explanations and
  7 walkthroughs. Learns which answer settled a question, per word.

### Content
- **Nine templates**, each with a symbol set: house-garden, ladder, flowchart,
  block-diagram, network, schematic, dsp-board, maker-schematic, maker-layout.
- **Four icon packs** (Apache-2.0) and a maker pack.
- Diagram samples rebuilt with real links and arrowheads instead of loose lines.

### Fixes
- **Hatch escaped its shape.** `drawHatch` left the hatch lines as the current
  path, so the outline stroke redrew them unclipped at full width.
- **Offset shrank closed shapes** asked to grow — the winding test was inverted.
- **`isFinite(null)` is true**, so null coordinates passed validation and became
  points at the origin.
- Storage falls back to session memory rather than disabling features, so a copy
  opened from a file still works — it just cannot remember.
- Escape and outside-click now close every panel consistently.
- The activity log persists across reloads.
- Multiple tabs are detected, and a symbol set changed in one is re-read in the
  others instead of being overwritten.

## 3.0 — 2026-08-29

Baseline: draw, style, layers, symbols, links, labels, hatch, sheet and title
block, SVG import and export, PNG, print at 1:1, autosave, custom toolbars.
