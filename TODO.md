# Tracker

Version 3.8.1. Everything known and not done, in one place. Ordered by what I would
do next, not by area.

Status: **open** · **next** · **decided against**

---

## Bugs

| | What | Status |
|---|---|---|
| B1 | **Layer edits are not undoable.** Change a layer's colour, or hide it, then Undo, and you undo whatever you drew before instead — worse than nothing happening. `S.layers` is already in the undo snapshot, so this is a missing `push()` on five handlers. | **next** |
| B2 | **Symbols containing links break silently when placed.** Object ids mean nothing in another drawing, so you get dangling connectors and no warning. Should refuse at the point of adding to the library. | **next** |
| B3 | **Grid, sheet and title block are outside the undo snapshot.** `gx`, `gy`, `major`, `sheet` and `title` are not captured, so they cannot be undone at all. See D3 — this may be correct rather than a bug. | open |
| B4 | **Reorder does not work inside a group.** An item in a group has an order within that group, and the four commands skip it. Ungroup, reorder, regroup is the only route. | open |
| B5 | **Panel positions are not remembered.** Drag the Ask or Symbols panel somewhere useful and it returns to its default next launch. | open |
| B6 | **Arc trimming, and break or extend on a curve, all refuse.** Honest refusals, but the gap is real. | open |

---

## From the usage log of 2026-08-30

Four minutes of trim and extend produced **52 attempts and 11 successes**. The
geometry was working; the messages were not.

| | What | Status |
|---|---|---|
| L1 | "Nothing crosses that line" fired 20 times. Trim cuts *between* crossings; cutting at a point is Break, and the message never said so — it suggested Erase, which deletes the whole object. | **done 3.8.1** |
| L2 | "Extend works on an open line" fired 8 times without saying what it had found. Now names it: "That is a rectangle, which has no free end." | **done 3.8.1** |
| L3 | "Tap the part of a line or rectangle" fired 13 times — tapping inside a closed shape, or missing a thin outline. Message improved, but the underlying issue is **hit tolerance on a 1px line under a finger**. | partly done |
| L4 | **Two tabs are open in most sessions**, and the autosave is repeatedly replaced. Detection exists; nothing helps you close the other one. | open |
| L5 | Split says "No intersections with other geometry found on the selected line(s)/rectangle(s)" — clumsy, and offers no next step. | open |
| L6 | **When a tool is active, nothing indicates which objects it can act on.** Highlighting valid targets on tool selection would have prevented most of the 41 failures. | open |

---

## Code review of 2026-08-30 — assessed against measurements

Measured first: the largest drawing this app has produced is **202 objects**, where
a brute-force hit test costs **0.1 ms**, or 0.6% of a frame.

| | Recommendation | Assessment |
|---|---|---|
| R1 | **FSM for pointer and gesture state** | **Agree, strongest case.** Eight interleaved state variables; I added two this session and each needed cancel hooks in three places. Prevents future bugs rather than fixing present ones. |
| R2 | **Byte-capped undo history** | **Agree** — my substitute for the review's delta-based history. At 10k objects, 150 snapshots hold 146 MB. Ten lines, removes the cliff, keeps a snapshot model that has never produced a wrong undo. |
| R3 | **Viewport culling in `draw()`** | **Agree** — ~15 lines, no invalidation burden if bounding boxes are cached lazily. Best benefit-to-risk on the list. |
| R4 | **Robust offset: self-intersection and collapse** | **Agree** — currently guarded and refused rather than solved. The difference between offset as a toy and as a tool. |
| R5 | **Module boundaries (IIFEs in one file)** | **Agree** — pure geometry with no `S` dependency becomes directly unit-testable instead of extracted by text, which is what `tests.js` does today. |
| R6 | **Spatial index for hit-testing and snapping** | **Correct but premature.** 150 lines plus invalidation at every mutation, for 0.6% of a frame. Revisit at a few thousand entities. |
| R7 | **Scratch registers to avoid allocation** | **Declined.** Measured 2× on 100k transforms; a real frame does ~2,000, so 28 microseconds. Cost is an out-parameter on every geometry function. |
| R8 | **Sentinel values instead of `delete o.color`** | **Declined.** Absent means "inherit from layer" — that is in the file format and the schema. Sentinels mean a migration and larger, less readable files, for an unmeasurable gain. |

---

## Features

| | What | Status |
|---|---|---|
| F1 | **Drawing scale.** The structural gap: the sheet is real millimetres, so an A3 border is 420mm while a plot is 26,000mm. It is why the plan template has no title block and why the app cannot issue architectural output. A project, not a feature. | open |
| F2 | **Array** — repeat at a spacing, rectangular or polar. Small. | open |
| F3 | **Fillet and chamfer** — round or bevel a corner. Moderate; needs tangent-arc maths. | open |
| F4 | **Command line with aliases** — `li`, `ci`, `off`, `tr`. The registry and a text input already exist. | open |
| F5 | **Working folder on desktop** — done for saving; Open could default to it too. | partly done |
| F6 | DXF import | decided against — ~400 lines, and ZIP import covers the symbol-library case |
| F7 | Ellipses and splines | decided against — new entity types through every renderer and exporter |
| F8 | DWG, anything | decided against |

---

## Measured on device, 2026-08-30 — RETRACTED, then corrected

### What I got wrong

I recorded that the app handled a very large drawing comfortably and closed four
items on that basis. **The test had only one layer visible.**

I also invented a node figure for that test — "2 million" — which was never
measured and never reported. It came from my own arithmetic about copies, not
from the app. Removed.

Hidden layers are skipped outright by both hot paths:

```
draw()      for(const e of S.entities) if(visible(e)) drawEntity(...)
segments()  if(!all && !visible(root)) continue;
```

With the stress file as it loads, that is **45 visible objects and 132 visible
nodes**, against 5,325 objects and 133,200 nodes hidden — **99.9% invisible**. So
when I reported that the app coped comfortably, it was drawing and snapping about
528 nodes. The four conclusions I drew from it were worthless, and I should have
asked which layers were on before drawing any.

### What the corrected test shows

All layers visible: **5,370 objects, 131,532 nodes.** Not copied. Result:
**a second or more of lag on every interaction**, and grouping everything froze
the screen.

Causes found and fixed, with measurements:

| | Cause | Cost | Fixed in |
|---|---|---|---|
| P1 | `segments()` rebuilt on every pointer move — 127,083 objects allocated per call | **58 ms × 60/sec** | 3.14.0, cached on a geometry version |
| P2 | The node counter walked the whole drawing every frame — my own regression from 3.10.0, and my test missed it because the call sat one level down through `updateStatus` | 0.78 ms × 60/sec | 3.14.0, cached |
| P3 | `removeObjects` used `includes()` inside a `filter` — 400 million comparisons, three times over | 225 ms per bulk removal | 3.13.0, Set |
| P4 | Grouping cloned every object individually — 21,480 JSON round-trips | 338 ms | 3.13.0, one clone |
| P5 | **`push()` serialises the whole document on every undoable action** | **1,193 ms at 18 MB** | **OPEN** |

### Still open

| | What | Status |
|---|---|---|
| P5 | `push()` is now the dominant cost and needs a decision, not a patch. Options: skip the snapshot above a size and declare undo unavailable; snapshot only what changed (the delta approach I argued against — this finding weakens that argument); or serialise off the main thread. | **needs a decision** |
| P6 | Retest at the corrected scale after 3.14.0 — the segment cache should be the largest single win, and P5's share will only be visible once it is the remaining term. | **next** |

### Standing lessons

**Ask what the test actually ran before drawing a conclusion from it.** Two
conclusions this session came from tests where I had not established what was
being exercised — this one, and the earlier claim that Trim only worked on
straight lines. A number measured on the wrong configuration is worse than no
number, because it gets recorded and acted on.

**Hidden layers make any performance test meaningless unless stated.** Any
measurement should record how many objects and nodes were *visible*, not how many
the file contained.

**Never write down a figure that was not measured.** I put "2 million nodes" into
these records. It was never reported and never measured — I derived it from my own
arithmetic about how many copies had been made, then cited it back as evidence. A
figure I invented is indistinguishable from one I was told, once it is written
down, and it then survives every later correction. Every count in this file and
the changelog now traces to something computed from an actual file: 131,532 nodes
and 5,370 objects in `stress-test.json`, 21,480 objects after four copies, 127,083
segments, 16.0 MB as live objects.

## Never examined

| | What |
|---|---|
| N2 | **Phone-sized layout.** Only ever seen on an iPad. Five status cells and floating panels at 390px are untested. |
| N3 | **Keyboard-only operation and screen readers.** Never looked at. |
| N4 | **Printing on paper.** The 1:1 claim has never been checked against a ruler. |
| N5 | **Storage eviction.** `persisted: not granted` in every session. What actually happens after Safari clears it has never been observed. |

---

## Recurring faults worth naming

Three patterns caused most of this session's bugs. Worth checking against before
any change.

1. **A parallel code path gets missed.** Text fill, text opacity, delete, nudge,
   reorder, six lock bypasses — all the same shape: a general feature added, and
   one path that does not go through the general place. Canvas versus SVG export
   is the standing example.
2. **Silence on failure.** A missed tap, a curved polyline, an empty template
   list, and the 41 log failures above. The geometry gets tested; the messages
   only get tested by using the app.
3. **A blanket rename touching prose.** `editable` → `canSelect` rewrote four
   sentences the user reads, one of which shipped. Now guarded by a check.

## Closed by measurement, 2026-09-01 — on-device figures at 39,740 and 79,480 nodes

Four items I had AGREED with. The device said no to each, and none was built. Kept here
because "we decided not to" is worth as much as "we did it", and because the argument for
each was persuasive.

| | agreed on | measured | verdict |
|---|---|---|---|
| R1 pointer FSM | eight interleaved state variables, and I added two | **0 clashes** across ~12,000 frames | not built |
| R3 viewport culling | ~15 lines, obvious win when zoomed in | **0% of entities off screen** (0 of 328) | not built |
| R7 scratch registers | 2x on a microbenchmark | 58,131 allocations at **2.50ms** per rebuild | not built |
| undo in a worker | snapshot measured 1,193ms on my desktop | **4.40ms** on the device — 270x out | not built |
| R6 spatial index | twice declined as premature | snapping **60% of all frame time**, 0.12% locality | **built**, 3.33.0 |

The pattern: my desktop estimates were wrong in both directions and by large factors. The
only one worth building was the one I had twice refused.

Culling deserves a note. It is not wrong in principle — it is useless HERE, because this
drawing is a handful of very large polylines rather than many small objects, so there is
nothing to cull at the entity level. On a drawing of ten thousand small symbols it would
pay. The measurement is of this drawing, not of the idea.

## Open, and now the whole of the performance problem

| | | |
|---|---|---|
| PAINT | static rebuild **45-52ms**, direct paint **65-72ms**, a fifth of frames over 50ms | decimation within a polyline at low zoom; instrumented in 3.37.0, awaiting a figure |
| HIT | hit test **5.25ms** each — the only remaining path with no index | small: reuse the segment index |
| EXPORT | never profiled until 3.37.0 | awaiting a figure |

