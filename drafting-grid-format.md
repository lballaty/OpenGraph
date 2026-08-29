# Drafting Grid — file format

Version 3.0 · 2026-08-29 · matches `drafting-grid.schema.json`

Five kinds of file, all JSON, each identified by its `app` field.

| `app` | Holds | Made by |
|---|---|---|
| `drafting-grid` | A drawing, or a template (same shape, no geometry) | Save to file · Save as template |
| `drafting-grid-symbols` | One named symbol set | Symbols → Save library |
| `drafting-grid-layer` | One layer and its contents | Layers → Export current layer |
| `drafting-grid-setup` | Every template, every symbol set, the workspace | Workspace → Export everything |
| *(no app field)* | A bulk export of browser-slot drawings | Open → Export drawings |

## Two rules that govern everything

**All coordinates are millimetres**, whatever unit is displayed. The unit is a
display setting, not a storage one.

**Y increases upward**, as in mathematics and DXF — not downward as in SVG and
screen coordinates. Anything read from SVG is flipped once on import; anything
written to SVG is flipped once on export.

**One exception, and it is a trap:** `gx` and `gy`, the grid spacing, are stored
in the *display* unit. A file with `unit:"m"` and `gx:1` means a one-metre grid,
not one millimetre. Nothing else in the format works this way.

## A drawing

```json
{
  "app": "drafting-grid", "v": 2, "uid": "p5pr-mte7f4vw-zfrd",
  "unit": "mm", "gx": 5, "gy": 5, "uniform": true, "major": 10,
  "view": { "cx": 0, "cy": 0, "zoom": 2.5 },
  "layers": [ { "id": 1, "name": "Walls", "color": "#1d2a35",
                "vis": true, "lock": false, "guide": false } ],
  "cur": 1, "nextLayer": 2, "nextId": 42,
  "entities": [], "measures": []
}
```

### Drawing-level fields

| Field | Meaning |
|---|---|
| `uid` | Stable identity, written on first save. Templates never carry one. |
| `nextId` | Next object id to hand out; raised past the highest id present on load. |
| `unit` | `mm` `cm` `m` `in` `ft` `px` — display only. |
| `gx` `gy` `uniform` `major` | Grid spacing (display unit), whether locked square, heavy-line interval. |
| `view` | `cx` `cy` in mm, `zoom` in screen pixels per mm. |
| `layers` `cur` `nextLayer` | Layer list, current layer id, next id to issue. |
| `snaps` `snapOn` `ortho` `polar` `pinc` | Snapping state; `pinc` is the polar increment in degrees. |
| `showDelta` `showGrid` `showArea` `gridInSvg` `scrollPan` `segMode` `snapFollowsZoom` | Display and input preferences. |
| `nudgeStep` `polySides` `textSize` | Arrow-key distance (mm, 0 = one grid step), polygon sides, default text height (mm). |
| `library` | Names the symbol set this drawing expects. |
| `sheet` `title` | Page border and title block; see below. |
| `tool` `rotIndividually` `autosave` | Restored working state. |
| `keys` | **Ignored on load.** Shortcuts belong to the workspace, not a drawing. |

`v` is written as `2`. It is read in one place only: a template declaring a
version above 2 is flagged as coming from a newer build, and anything this build
does not recognise is ignored. Drawings do not check it at all.

## Entities

Seven types. Every one may carry `l` (layer id), and optionally `id`, `label`,
`lo`, `lsize`, `color`, `weight`, `dash`.

### poly
```json
{ "t":"poly", "p":[{"x":0,"y":0},{"x":100,"y":0}], "cl":true, "l":1 }
```
`cl` closes it. A closed poly can take `fill` and `hatch` and reports an area.
The closing point is **not** repeated in `p`.
Also: `curve` (smooth through the points), `head` `tail` (line ends), `ahs`
(line-end size, mm).

### rect
```json
{ "t":"rect", "x":0, "y":0, "w":100, "h":60, "l":1 }
```
Axis-aligned always. Rotating by anything other than a multiple of 90° converts
it to a poly.

### circle · arc
```json
{ "t":"circle", "c":{"x":0,"y":0}, "r":50, "l":1 }
{ "t":"arc", "c":{"x":0,"y":0}, "r":50, "a0":0, "sw":1.5708, "l":1 }
```
Angles in radians, counter-clockwise. `sw` is a **signed sweep** — negative goes
clockwise. DXF, which is always counter-clockwise, is written by swapping the
angles rather than negating.

### text
```json
{ "t":"text", "p":{"x":0,"y":0}, "str":"KITCHEN", "size":3.5, "rot":0, "l":1 }
```
`size` is cap height in mm, `rot` radians counter-clockwise, `mir` flips the
local X axis.

### group
```json
{ "t":"group", "items":[ ... ], "l":1 }
```
Nestable. `merged` locks it against Ungroup.

### link
```json
{ "t":"link", "a":{"id":3}, "b":{"id":7,"fx":-1,"fy":0},
  "via":[{"x":50,"y":20}], "head":"arrow", "l":2 }
```
**Stores no coordinates.** Both ends resolve at draw time from wherever the
objects are now, which is what makes a connector follow its boxes.

An end is `{id}` — attached to an object — or `{x,y}` — a bare point.
`fx` `fy` pin it to a side, as fractions of the object's half-size, so the port
survives a resize. `gap` is clearance from the edge in mm.

`via` are waypoints in order. `curve` draws a smooth path.

**Both ends must exist.** Deleting an object cascades to its links; a layer
export carries a link only when both ends are on that layer.

## Shared fields

| Field | Meaning |
|---|---|
| `color` | `#rrggbb`. Absent means the layer colour. |
| `weight` | Stroke width in mm. **Never scaled** — it is a pen width. |
| `dash` | `solid` `dashed` `dotted` `dashdot` |
| `fill` | Solid fill, closed shapes only. |
| `hatch` `hs` | Pattern name and spacing in mm. `none` `d45` `d135` `cross` `horiz` `vert` `grid` `brick` `dots`. |
| `id` | Assigned lazily, only when a link needs to refer to it. |
| `label` `lo` `lsize` | A name that moves with the object; offset in mm from the bounding-box centre; height in mm. |
| `head` `tail` `ahs` | Line ends: `none` `arrow` `open` `hollow` `dot` `bar`. |

## Measures

Kept in `measures`, not `entities`.

```json
{ "a":{"x":0,"y":0}, "b":{"x":100,"y":0}, "off":22, "l":3 }
{ "t":"angle", "vertex":{...}, "a":{...}, "b":{...}, "r":40, "l":3 }
```
A length measure has no `t`. `off` is the offset of the dimension line in mm.

## Sheet and title block

```json
"sheet": { "on":true, "size":"A3", "land":true, "margin":10,
           "block":true, "x":-210, "y":-148.5, "placed":true },
"title": { "project":"", "title":"", "number":"", "rev":"A",
           "scale":"NTS", "date":"", "drawn":"", "checked":"", "sheet":"1 of 1" }
```

The sheet is in **real millimetres**, so an A3 border is 420 mm wide. There is no
drawing scale, so a title block only makes sense on drawings whose real extent is
about paper-sized — schematics and diagrams, not plans drawn at 1:1.

## Symbol set

```json
{ "app":"drafting-grid-symbols", "v":1, "unit":"mm", "name":"Architectural",
  "symbols":[ { "name":"Door 900", "items":[ ... ], "w":900, "h":60 } ] }
```

**A symbol's origin is its bounding-box minimum, not its centre.** Placing one
by its centre means offsetting by `w/2, h/2` — getting this wrong is what put
every node in the first generated diagrams in the wrong place.

`items` are ordinary entities, normalised so the minimum corner is at (0,0).
**Links inside a symbol do not survive placement** — ids mean nothing in another
drawing.

## Layer file

```json
{ "app":"drafting-grid-layer", "v":1, "unit":"mm",
  "layer":{ "name":"Setback", "color":"#c0392b", "guide":false },
  "entities":[ ... ], "measures":[ ... ], "droppedLinks":0 }
```

On import the layer is added under a new id, ids are reissued, and a name that
already exists gets a suffix rather than merging.

## Setup file

```json
{ "app":"drafting-grid-setup", "v":1,
  "ui":{ ... }, "templates":{ "Ladder": {drawing} },
  "libraries":{ "Ladder": [symbols] } }
```

The only thing that carries a workspace — toolbar layout, icons, colours, hidden
buttons, shortcuts. Storage is per origin, so this file is the only way to move a
setup between a hosted copy and a local one.

## Draw order

**Array order is paint order.** Backgrounds must come first in `entities`. A zone
rectangle written after the nodes it contains will cover them.

## What the app validates on load

Every route — open, paste, ZIP, library, setup, layer, template — runs the same
entity check. Faults are reported to the log with position, type and reason, the
bad entity is dropped, and the rest of the file loads. Layer references that
point nowhere are repaired to the first layer.

Templates additionally get a compatibility gate: refused for an unknown unit,
missing layers, duplicate layer ids or an unusable view; asked about for a
toolbar layout, embedded geometry or a newer version; and merely mentioned for a
symbol set you have not loaded yet.

## Export formats

| Format | Carries | Loses |
|---|---|---|
| **DXF** (R12) | Geometry, layers, colours, dashes, text, arcs | Stroke weight, hatch, labels, fills |
| **SVG** | Everything visible, hatch as real patterns | Editability |
| **PNG** | The canvas as drawn | Everything else |

DXF import does not exist. DWG is not supported in either direction.
