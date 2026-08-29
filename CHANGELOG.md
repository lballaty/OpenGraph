# Changelog

The **This build** line in Settings → About is a hash of the file's own contents.
Two copies showing the same one are the same file. Use it to tell builds apart —
the version number alone will not, since several ship on the same date.

## 3.1 — 2026-08-29 · build `447628c3`

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
