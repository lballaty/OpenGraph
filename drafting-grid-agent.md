# Drafting Grid — generating drawings programmatically

Version 3.0 · 2026-08-29 · companion to `drafting-grid-format.md`

Notes for producing valid drawings from code. Every point here comes from
something that went wrong at least once.

## Start from a template

Read a `-template.json`, replace `entities` and `measures`, keep everything else.
That inherits the unit, grid, layers and sheet already suited to that kind of
drawing, and guarantees the layer ids you reference exist.

```js
const tpl = JSON.parse(fs.readFileSync("ladder-template.json"));
const doc = { ...tpl, entities: E, measures: [], nextId: n };
```

Strip `uid` if the template has one, or every drawing you generate claims to be
the same drawing.

## The five things that go wrong

**1. A symbol's origin is its bottom-left, not its centre.**
```js
items.forEach(o => translate(o, cx - sym.w/2, cy - sym.h/2));
```
Placing by the raw origin puts everything up and to the right of where you meant.
This put every node in the first generated diagrams in the wrong place.

**2. Array order is paint order.** Zone rectangles, backgrounds and swimlanes go
in `entities` *before* the things they sit behind.

**3. Y increases upward.** A y of 100 is above a y of 0. Anything ported from
SVG thinking needs flipping.

**4. `gx` and `gy` are in the display unit.** Everything else is millimetres.

**5. Links need ids on both ends, and the ids must be yours.** Assign them as
you build:
```js
const o = { t:"rect", ..., id: nextId++ };
ID["pump"] = o.id;
// later
E.push({ t:"link", a:{id:ID["pump"]}, b:{id:ID["tank"]}, head:"arrow", l:2 });
```
Set `nextId` on the document past the highest id used, or the app will reissue
ids that are already taken.

## Diagrams: use links, not lines

A line between two boxes is not a connector. Move the box and the line stays.

```json
{ "t":"link", "a":{"id":3}, "b":{"id":7}, "head":"arrow", "l":2 }
```

The link stores no coordinates — it resolves from wherever the objects are. This
also means you do not have to compute where the line should meet the box edge:
that is done at draw time.

Pin an end to a particular side with `fx`/`fy`, fractions of the object's
half-size: `{"id":7,"fx":-1,"fy":0}` is the left edge, mid-height.

## Names: use labels, not text

```json
{ "t":"rect", ..., "label":"Pump relay", "lsize":2.2, "lo":{"x":0,"y":18} }
```

A `label` moves with its object. A separate `text` entity does not, and gets left
behind the first time anything is rearranged.

`lo` is the offset in mm from the object's bounding-box centre.

## Arrowheads

Do not draw them. `head` and `tail` on a poly or link take
`arrow` `open` `hollow` `dot` `bar`. Hand-built three-point triangles were in the
first generated samples and had to be removed from all of them.

## Sizing

**Schematics** — put every two-terminal part on a whole number of 2.54 mm steps,
or leads will not meet. Check it:
```js
const g = sym.w / 2.54;
console.assert(Math.abs(g - Math.round(g)) < 0.02, sym.name + " is off-grid");
```

**Board layouts** — real millimetres, so a 100 × 80 board is `w:100, h:80` and
prints at true size with the scale field set to 1:1.

**Plans** — real size too, so a 26 m plot is 26000. A sheet border cannot contain
that; leave `sheet.on` false until drawing scale exists.

**Diagrams** — no scale, but keep the extent inside the sheet. An A3 landscape
frame with a 10 mm margin gives about 400 × 277 mm usable.

## Validate before shipping

```bash
npx ajv-cli validate -s drafting-grid.schema.json -d mydrawing.json
```

The schema covers all seven entity types, link ends and ports, hatch, labels,
ids, sheet and title. It will not catch the five mistakes above — those are
semantic, and worth asserting yourself:

```js
// every link resolves
const ids = new Set(); walk(E, o => o.id != null && ids.add(o.id));
E.filter(o => o.t === "link")
 .forEach(l => console.assert(ids.has(l.a.id) && ids.has(l.b.id), "dangling link"));

// nothing overflows the sheet
const b = bbox(E);
console.assert(b.w < 400 && b.h < 277, "too big for A3 landscape");

// ids are unique
console.assert(ids.size === count(E, o => o.id != null), "duplicate ids");
```

## What the app will do to your file on load

Every entity is checked. Anything malformed is **dropped**, not refused — the
rest of the drawing still opens, and the log names the position, type and reason.
So a file that "mostly works" will quietly arrive missing things unless you
validate first.

Faults it catches: a polyline with fewer than two points, a rectangle of zero or
negative size, a circle or arc of zero radius, an arc with no sweep, text with no
string, an empty group, a link missing an end, a non-numeric coordinate
(including `null`, which passes a bare `isFinite` check), and an unknown `t`.

Layer references that point at a layer not in the file are repaired to the first
layer, and that is logged too.

## Units and rounding

Round coordinates to 4 decimal places. Beyond that is noise that inflates the
file and shows up as jitter in DXF export.

## Version field

Set `v: 2`. A template declaring anything higher triggers a "written by a newer
version" warning on import. Drawings ignore it entirely.

## Reference

- `drafting-grid.schema.json` — machine-checkable
- `drafting-grid-format.md` — every field explained
- `starter/*-template.json` — nine worked starting points
- `samples/*-drawing.json` — nine worked drawings, all schema-valid
