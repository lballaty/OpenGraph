# Changelog

The **This build** line in Settings → About is a hash of the file's own contents.
Two copies showing the same one are the same file. Use it to tell builds apart —
the version number alone will not, since several ship on the same date.

## 3.53.1 — 2026-09-01 · build `a530cd88`

### Undo and Redo are back together
Pinning Undo in 3.48.0 put it on the far side of a divider from Redo, splitting a pair
that has always been adjacent. Reaching for one and not finding the other beside it is
worse than either position on its own, and I did it without noticing.

Both pinned now, Undo first.

### The rule I should have followed
A command that belongs to a pair moves **with its pair, or not at all**. Undo/Redo,
Group/Ungroup, Front/Back, Trim/Extend read as couples on the bar and are used as
couples.

`checks.js` enforces it: any pair with one member pinned and the other not is refused.
Verified by splitting them again in a copy — it names `undo/redo`.

Writing that check, my first version referenced a variable declared further down the
file and **threw before any check ran** — a dead-zone error in the very file whose job
is catching mistakes. The second version listed a `selnone` command that does not
exist, and reported a split that was its own invention. Both fixed; the check now
requires both halves of a pair to be real commands before calling anything split.

### And the answer before this one was about the wrong thing
You reported the button order changing; I replied about node counting. That was my
error, not a disagreement.

851 tests.

## 3.54.1 — 2026-09-01 · build `41bc5a42`

### A standing bar came back away from the edge
`fitBar` measures the buttons and resets the bar's width — and the saved `x` was chosen
for the **old** width, so a bar flush against the right edge came back inboard by the
difference. A width 80 pixels narrower leaves 80 pixels of daylight.

Two parts to it:

- **x is re-derived after fitting.** `vertX` already returns the correct edge for the
  side the bar parks on, allowing for the handedness setting. It existed and `fitBar`
  simply never called it.
- **Standing bars are now fitted on load**, not only on resize. Their size was saved for
  the button set of the moment — and buttons have been added since, several of them
  today — so a bar kept a stale size with a position derived from a different one. On the
  next frame, because a bar has no measurable width until it is laid out.

875 tests.

## 3.55.0 — 2026-09-01 · build `88465a46`

### Bars remember where you put them, per orientation
One x and one y meant rotating **clamped** them to fit the new shape and overwrote your
choice — so the position was destroyed on the way out, not on the way back, and rotating
home found the clamped number.

Two slots now, one per orientation, with the size as well: a standing bar fitted for
landscape is the wrong height for portrait, and a position without its size lands in the
right place at the wrong shape.

### Dragging a symbol out of the panel was broken
The gate that separates a drag from a list scroll was `|dy| > |dx|` — so **any** gesture
aimed below the symbol was discarded as a scroll. From a panel down the side of the
screen, most of the sheet is below.

It is a cone now, two and a half to one: a flick up or down the list still scrolls,
anything aimed at the paper is a drag. A finger also curves, and the first few pixels of
a real gesture are rarely the direction intended.

### The panel shows the symbols
A name tells you what someone called it. A thumbnail tells you what it **is**, and a set
of thirty schematic parts is unusable from names alone.

Drawn with the same `drawEntity` the sheet uses, at twice the size for sharpness, scaled
to each symbol's own extent. Using the real renderer rather than a second one, because a
separate preview would slowly come to disagree with what actually gets placed.

### The Place button is gone
Asked directly: why have it, when the row can be tapped and dragged? No good answer. The
**row** arms the symbol; dragging places it directly. A tap on Rename or Delete inside
the row does not arm, which is the only reason the button had any claim.

### And whether the panel closes is your choice
**Keep the panel open while placing**, on the panel itself rather than buried in
Settings — one symbol wants the panel gone, thirty want it to stay, and it changes with
what you are doing.

### A fault that would have thrown on the first symbol
`row.append(nm,dim,place)` outlived the definition of `place`. The syntax check cannot
see an undefined name and the harness only caught it because it renders a real symbol.

907 tests.

## 3.54.0 — 2026-09-01 · build `12f247aa`

### Undo and Redo were split, and that was my doing
Pinning Undo in 3.48.0 put it on the far side of a divider from Redo — a pair that has
always been adjacent. You reach for one and the other is not beside it, which is worse
than either position on its own.

They are pinned **together** now. The rule this should have followed from the start: a
command that belongs to a pair moves with its pair, or not at all.

### And the arrangement is yours now
I have moved buttons three times this session to solve reachability — Select, Select
all, Undo — and each time rearranged a bar someone had learned, without saying so. Where
a button sits is a preference and was never mine to set.

**Long press any toolbar button:**

- **Pin** — it stays visible however far the bar scrolls
- **Unpin** — back into the scrolling list
- **Move earlier / Move later** — one step along the bar
- **Drag to rearrange** — then drag buttons freely; tap the canvas when done

The name still appears first on a long press, because holding to check what a button is
remains the common case and must not be punished with a menu. The arrange menu comes a
moment later.

Your choices are saved with the workspace and **shadow** the built-in defaults rather
than replacing them, so a fresh install still has Select and Undo out of the scroll.
A stored id for a command that no longer exists is discarded — the pin list also decides
placement, so a stale one would lose a button entirely.

### Two things the tests caught
A dragged button is destroyed and recreated by every rebuild, so it is found again by
its command id rather than held by reference.

And I wrote a comment claiming the pinned area follows the order of the `PINNED` array.
It does not — it follows the bar order. The test output said so and the comment is
corrected.

868 tests.

## 3.53.0 — 2026-09-01 · build `7d40abb3`

### Cmd+A does nothing on an iPad, and it is not the app
Corrected: an iPad **does** have Cmd with a hardware keyboard. The handler is right —
in testing, `Cmd+A` selects everything and prevents the default, with focus on the
canvas or on a toolbar button. **iPadOS claims the chord and no keydown reaches the
page.**

Ten commands sit behind Cmd chords for the obvious reason: they are the familiar ones.
Each now has a **second binding that nothing reserves**:

| | | |
|---|---|---|
| Select all | `Cmd+A` | **`Shift+Q`** |
| Undo · Redo | `Cmd+Z` · `Cmd+Shift+Z` | **`U`** · **`Y`** |
| Copy · Paste · Cut | `Cmd+C` · `Cmd+V` · `Cmd+X` | **`Shift+C`** · **`Shift+V`** · **`Shift+X`** |
| Save · Open · Print | `Cmd+S` · `Cmd+O` · `Cmd+P` | **`Shift+W`** · **`Shift+I`** · **`Shift+P`** |
| Group | `Cmd+G` | **`Shift+N`** |

The primaries stay, because on a desktop they are what anyone tries first. Alternatives
are **defaults, not overrides**: a binding you have set yourself always wins, and an
alternative is never allowed to displace a real one.

### Three of my first picks were already taken
`Shift+A`, `Shift+S` and `Shift+O` — by Array, Resize and Offset. The collision guard
would have skipped them **in silence**, which for Select all means the reported problem
persists behind a fix that looks applied. A skipped alternative is now logged, and a
test checks every one against the primaries.

849 tests.

## 3.52.0 — 2026-09-01 · build `8dea5d94`

### Select all had no route on a tablet
It sat on the Edit bar behind **Cmd+A** — and an iPad has no Cmd key, so the button was
the only way, and it lived inside a list that scrolls.

Pinned now, beside Undo, Settings and the guide.

### And the long press always offers the way out
Three reports in one session were the same shape: **Select** unreachable, the top
button of a floating bar unreachable, and now **Select all**. The rule worth stating is
that a command which is the only way *out* of a state must not depend on the toolbars
being in a good condition.

Pinning helps. A long press on empty canvas is stronger: it is reachable wherever you
are, and a gesture cannot scroll away, be collapsed, or be hidden behind a floating
panel. The quick menu now ends with an **Always here** section carrying Select, Select
all and Undo — omitting any already listed above it, and honouring a command someone
has deliberately hidden.

### Caught by my own sweep, again
The new code used `includes()` inside a `filter` — three items against five, so
trivially small. The sweep refused it anyway, and it is right to: the pattern is what
gets copied somewhere it is not small, which is how eleven of them accumulated in the
first place. **Third time today** I have written it and been caught.

840 tests.

## 3.51.0 — 2026-09-01 · build `181289b2`

### Why there is a zoom limit, and why it was the wrong size
Asked directly, and the honest answer is short. It protects three things:

- `toM` divides by the zoom, so it cannot be zero
- two fingers meeting in a pinch give a ratio near zero, which would drive the zoom to
  nothing in a single gesture
- `gridStep` multiplies by ten until lines are four pixels apart, and needs a bound

**None of those needs a large number.** And nothing else degrades as the zoom falls:
coordinates are Float64 and unchanged by zoom, screen coordinates get *smaller* as you
zoom out so precision improves rather than decays, and the grid already says "too fine
to draw" and stops.

The old 0.001 was not derived from any of that. I picked it, it allowed about 1.4 km
across a screen, and it was the clamp behind the report.

Now **1e-7** — roughly **13,660 km**. A guard rail rather than a policy.

### And it says so when you reach it
> *"That is as far out as it goes — the view is 13,660 km across."*

Reaching a limit and having nothing happen is indistinguishable from the app being
broken, which is precisely how it was reported and took several exchanges to tell
apart. Throttled to once every four seconds rather than once a session: someone who
zooms out, works, and zooms out again deserves telling both times.

### Kilometres
With the floor lowered, the scale bar was reporting a view as **"2000000 m"** —
technically right and useless, which is the fault the scaling formatter was written to
fix in the first place. Metres now step up to kilometres past a thousand, and feet to
miles, since a drawing in inches will not want kilometres.

835 tests.

## 3.50.0 — 2026-09-01 · build `ffa6168b`

### You can zoom out fifty times further
`MIN_ZOOM` was 0.001 — about **1.4 km** across a 1366px screen. That sounded generous
and was the clamp being hit: zoom out, and it simply stops with nothing changing size,
which is exactly what reaching a limit looks like.

Now **0.00002**, about **68 km**. Nothing pays for it: the grid already refuses to draw
when its lines fall under four pixels apart and says *"too fine to draw"*, the
decimation guard allows fifteen decades, and coordinates stay Float64 throughout.

The limit exists to stop a runaway pinch, not to police how far out anyone may look.

### The scale bar now says how wide the view is
Reading the bar as *"how far can I see"* is the natural mistake — it is a **ruler**,
not a span. Underneath it now:

```
├──────────┤
   200 m
              view 1366 m across
```

Those are different questions and the app was only answering one of them.

### What actually happened here
The report was *"cannot zoom out past 10 m"*. The 10 m was the **grid interval** — the
spacing being drawn, which decimates in powers of ten and lands on exactly 10 m at the
old limit and cannot step again. The view at that point was over a kilometre wide.

I spent four exchanges looking for a clamp at 10 m, wrote two diagnostics, and never
asked the one question that would have settled it: *what is the number, and what is it
measuring?* Three figures in that cell mean three different things, and I added the
third specifically to tell them apart, then asked you to read "the Grid cell" without
saying which part.

827 tests.

## 3.49.2 — 2026-09-01 · build `2c78f3d2`

### The details panel now selects its own text
You were right to suspect the copy. The text was being produced correctly — 1,279
characters, panel open, log included — but **nothing selected it**. Copying meant
tapping into the field, long-pressing, Select All, then Copy: four steps on a tablet,
and missing any one of them yields an empty paste.

Eight empty attachments in a row is exactly what that looks like from the other end,
and I spent them blaming the transfer rather than testing the path I had rewritten
twice the same day.

Now focused and fully selected on open, so it is one press of Copy. `focus()` first,
because `select()` on an unfocused field is a no-op in Safari; `setSelectionRange` as
well, because iOS ignores `select()` on some fields. Belt and braces on a path whose
entire purpose is getting text out of the app.

The title reads *"App details — already selected, just Copy"* rather than *"select all
and copy"*, which was instructing you to do the work the app should have done.

One test then failed against correct code: it asserted the old status message telling
you to select the text yourself. That instruction is gone, because the app does it.

824 tests.

## 3.49.1 — 2026-09-01 · build `b89ea000`

### "Cannot zoom out past 10 m" — not reproduced, so instrumented instead
I could not make this happen. On the current build, driven headlessly:

| | |
|---|---|
| wheel zoom out | 5.0 → 0.001, reaching **1,180 m across** |
| pinch zoom out | 5.0 → 0.001, the same |
| `MIN_ZOOM` | 0.001 — over a kilometre on your screen |
| scale bar label | progresses correctly: 2 m, 5 m, 20 m, 50 m, **200 m** |

`dimGeom`, `gridStep`, the step floor and the scale bar formula are all correct at
that zoom, and there are only four writers of the zoom value — two gestures and Fit,
all clamped to the same wide limits.

So rather than guess a fourth time, the app now says which of two things is
happening:

- **A clamped gesture reports itself**, once per session: what was asked for, what was
  allowed, where it ended up, and what the scale bar would then read.
- **The Grid cell states the view span directly** — `view 124 m across`. The scale bar
  shows a round number chosen for the *bar's* length, not the width of the window, so
  it can look stuck while the zoom is moving. This figure cannot.

If the span figure also sticks, the zoom is genuinely clamped and the log will say by
what. If it keeps rising while the scale bar sits at 10 m, the fault is in the bar and
not the zoom.

### A note on my own harness
Chasing this, the harness reported the scale bar being drawn at `y = −23`, which I
briefly took for a real fault. jsdom gives elements zero size, so `H` was 1. Worth
recording: **the harness can produce symptoms the app does not have**, and a
measurement from it needs the same scepticism as any other.

819 tests.

## 3.49.0 — 2026-09-01 · build `012250cb`

### Radius and diameter of a circle or arc
The status bar offered **Area** and **Perimeter** for a circle — neither of which is
the number anyone wants when drawing a hole or a turning circle. Select one and the
Radius cell now reads:

```
R 250 mm  Ø 500 mm            a circle
R 250 mm  Ø 500 mm  90.0°     an arc, with its included angle
R 6 mm  Ø 12 mm  ×4           four equal holes
3 circles, 6 mm to 250 mm     mixed radii
```

**Both** figures, because both get used: a radius to set out from a centre, a diameter
to order a pipe or check a bore. Converting between them in your head while reading a
screen is the sort of small friction that makes a tool tiresome.

An arc also shows its **included angle** — the third thing you need, and the only one
you cannot work out from the other two. Mixed radii show the range rather than a single
figure, which would be a lie. It looks inside groups, and scales units like every other
readout, so a 3m turning circle does not read 3000 mm.

### One deliberate inconsistency
The cell **hides** when nothing round is selected, where Area and Perimeter sit at "—".
The status bar scrolls horizontally, and a report this session was that a scrolling bar
put a button out of reach — a cell that is meaningless most of the time should not push
the useful ones off the end.

Area and Perimeter are not changed to match: they are long-standing and someone may be
reading their position, and one cell that comes and goes is a smaller surprise than two
that start doing so.

809 tests.

## 3.48.1 — 2026-09-01 · build `f4d7ecda`

### A dimension label vanished on zooming in
A dimension is drawn **offset** from the two points it measures — that offset line,
and the label on it, are what you see. But its bounding box covered only the two
measured points.

The box was wrong from the start and never mattered, because nothing consulted it for
a measure until **viewport culling** arrived in 3.41.0. Zoomed out, the whole drawing
is on screen and the cull never fires. Zoom in and it starts working — dropping
dimensions whose *measured* line has left the view while their *visible* line and
label have not.

Fixed in `objPoints`, which feeds the box. `vertsOf` still returns the raw points:
snapping and sticky ends care where the measurement was taken, not where its label
sits.

### And the same fault for a dragged label
An object's label can be dragged well away from it, so a label could be on screen with
its object off it and be culled along with it. Added to `objBBox` rather than
`objPoints`, because a label is not geometry and hit-testing must not treat it as part
of the shape.

### The margin was not the answer, and I tried it first
I widened the cull margin from 120px to 200px to cover the label text. At 200 the
culled region considers **87% more area than the screen**, against a measured **73%**
of objects being off it — handing back most of the saving to cover something that
could simply be measured instead.

Reverted, with the reasoning recorded next to the constant so nobody widens it next
time instead of fixing the box.

797 tests.

## 3.48.0 — 2026-09-01 · build `6d2d5876`

### Select is pinned, so it cannot scroll out of reach
Reported: *"I couldn't switch to Select because the menus had scrolled."*

That is the worst version of the scrolling fault, because **the way out of every other
state was the thing out of reach**. Select is how you deselect, grab a handle, or stop
drawing — without it you are stuck in whatever tool you happen to be in, and the button
that fixes it is the one you cannot get to.

Select is now pinned on the Draw bar, and Undo on the Edit bar, in the same area
Settings and the guide already used for exactly this reason. Pinned means **outside the
scrolling list**: on a docked bar it sits past the scroll at the end, and on a floating
bar below it, visible while the list scrolls above.

3.45.1 fixed the flex bug that let the list scroll away in the first place, and that
fix stands — a test asserts it, so pinning does not become the excuse for leaving the
scroll broken. But the way out should not have been inside the thing that can break.

788 tests.

## 3.47.0 — 2026-09-01 · build `2e34c19c`

The remaining known bugs. Two were real, one needed a sentence, one needed a decision.

### B6 — an arc can be trimmed
It was refused outright: *"Trimming an arc further is not supported yet."* The maths
is the circle case with one difference that matters: a circle wraps, so every gap
between crossings is a candidate; an arc has **ends**, and the piece you tap may be
bounded by an end rather than a crossing.

A cut in the **middle** is refused with a reason, because it would leave two arcs and
one object cannot be two — *"Trim from one end, or use Break to split it first."*
Silently keeping half would be worse than refusing.

It reuses `circleCrossings`, since an arc has a centre and a radius and that solver
already answers the question. I had written `arcCrossings()` as though it existed —
**the fourth helper I have invented today**, after `selectionBBox`, `updateUndoRedo`
and `drawSelOutline`.

### B5 — panel positions are remembered
Help, Ask and Symbols all set `style.left` directly with nothing stored, so a panel
dragged somewhere useful returned to its default on every open.

Recorded on **drop**, not on every pointer move — a gesture whose only interesting
moment is the end. Restored on the next frame, since a hidden panel has no size and the
clamp needs its width. Clamped to the window that exists *now*, because a position
saved in landscape puts a panel off the side in portrait, and a panel you cannot reach
is worse than one in the wrong place.

Kept in the **workspace**, not the drawing: where you like a panel should not travel
with a file you send someone.

### B4 — reordering a group says what it does
A group reorders as a whole, and that is the only order it has at the top level. A
reasonable rule, and an unreasonable thing to work out from nothing happening. Said
once, and only when the selection is entirely groups — with a mixture the loose
objects do reorder, so the message would be wrong.

### B3 — not a bug, and now recorded as such
The grid, unit, sheet and title block are outside the undo snapshot. That was listed
as a bug; it is correct. They are **view settings, not drawing content**, and an Undo
that silently put the grid back while leaving your last line in place would be a worse
surprise than the one it fixed.

The test of whether something belongs is whether undoing it would restore **work**.
Layers are in, and are work — which is why 3.45.0 had to add the missing `push()` calls
rather than change what a step holds.

780 tests. Every known bug is now fixed, explained, or decided against.

## 3.46.0 — 2026-09-01 · build `dcd60f9d`

### A dimension label could not be grabbed or moved
Everything needed was already there — the offset handle, and hit testing correctly
against the **offset** line rather than the raw measured points. What was missing was
the state.

A dimension is created **already offset**, and the offset handle is the only way to
change that. But handles belong to the Select tool, and finishing a measurement left
you in Measure — so the next tap started another measurement instead of reaching the
handle. There was no way to move the label without knowing to switch tools first, and
nothing said so.

Two changes:

- The new dimension is **selected**, so its handles are candidates at all, with a line
  saying where to grab: *"Drag the round handle at the middle to move the label off the
  line."*
- The **Measure tool may grab a handle when idle** — before a new measurement has
  begun. Scoped that tightly so it cannot interfere with one in progress.

Switching to Select automatically would have been the easy fix and the wrong one:
measuring is usually done several times in a row, and taking the tool away after each
would be worse than the bug.

The handles are drawn in the same state the press handler accepts them, because a
grabbable handle you cannot see is no better than none. The condition appears in both
places and a test asserts they stay in step.

745 tests.

## 3.45.1 — 2026-09-01 · build `784724f5`

### The top button of a floating Draw or Edit bar was out of reach
`.bar.float` is a flex column with `overflow:hidden`, and `.items` had `flex:1 1 auto`
with **no `min-height:0`**. A flex child does not shrink below its content height
unless that permits it — so the list grew to fit every button, the bar could not
contain it, and whether you could see the first button depended on where the browser
happened to leave the scroll.

### Fourth time today, and the first three were my fault twice over
`#askBody`, `#helpBody` and `#panelBody` had the **identical** omission this morning.
I fixed all three **by name**, one after another, and never once swept for the
pattern — which is exactly why the toolbars survived to be reported.

`checks.js` now sweeps every CSS rule that declares `overflow:auto` on a growable flex
child and refuses without `min-height:0`. Verified by removing it in a copy.

Also added to the base `.items` rule. It already had `min-width:0`, which is the
correct axis for a docked row — but a rule that is right only because another rule
happens to override its direction is not right.

737 tests.

## 3.45.0 — 2026-09-01 · build `8ad3c171`

### Layer edits are undoable
The oldest open bug, and worse than it sounds. Layers were **already in the undo
snapshot** — the only thing missing was recording a step. So changing a layer's
colour, hiding it, locking it or marking it a guide left the history untouched, and
Undo then undid **whatever you last drew** instead. Silently, and the layer change
stayed.

Five controls, all fixed. Adding and deleting a layer already recorded a step —
deleting takes the objects on that layer with it, so an unrecorded delete would have
been the worst of the set.

The test sweeps every assignment to a layer field from a control, rather than checking
the ones I thought of. That is how I found five rather than the two the tracker named.

### The tracker was stale in five places
Corrected against the device data, in `TODO.md`:

| claimed | actually |
|---|---|
| B2 symbols with links break | fixed 3.22.1 |
| F2 Array | built 3.37.0 |
| R3 viewport culling | built 3.41.0 |
| R6 spatial index | built 3.33.0 |
| P5 `push()` at 1,193ms | **wrong by 270×** — 4.40ms on the device |

Recorded rather than edited away, because what a list *claimed* matters when reading it
later.

736 tests.

## 3.44.0 — 2026-09-01 · build `871cf47e`

### Dragging kept grabbing a handle instead
Both tolerances were **22px on touch** — the same — and handles are tested first. But
a vertex sits *on* the object, so any press near a corner was inside both and the
handle always won.

On anything smaller than about 100px across, **every** point is within 22px of some
vertex. So a small object could not be dragged at all; it could only be resized. The
smaller the thing, the less able you were to move it, which is the opposite of what
anyone expects.

| | object | handle before | handle after |
|---|---|---|---|
| touch | 22 px | 22 px | **13 px** |
| mouse | 11 px | 12 px | **8 px** |

Grabbing a particular vertex is a precise act and deserves a precise tolerance;
moving is the common one and keeps the generous ring. The object tolerance is
unchanged — selecting should not get harder to fix dragging.

### Two cases the tolerance alone does not solve
**A crowd of handles.** On a polyline with vertices a few pixels apart, whichever is
nearest is effectively arbitrary — you cannot have meant a particular one. More than
three within reach now defers to moving.

**An object too small to offer both.** Below about 33px on screen there is no ring
left, so it would still only resize. The handle stands aside and says why, because
zooming in is the real answer and is not obvious from the symptom:

> *"That object is too small on screen to grab a single point — zoom in to edit its
> corners. For now the press moves it."*

726 tests.

## 3.43.0 — 2026-09-01 · build `79e75154`

### Three caches were thrashing, and I had read it as expensive work
```
index rebuild      5046ms ×575   (8.78ms each)
segments rebuild    353ms ×448
flatten rebuild      19ms ×418
```

Against **33** actual geometry changes. `index rebuild 5046ms ×575` reads as an
expensive operation, and I read it that way until the call count gave it away. Two
separate causes, both mine.

**The spatial index had one slot with an `all` flag.** Snapping asks for the visible
set; the hit test asks for everything — and since 3.41.0 both run per interaction, so
every alternation rebuilt the whole index. It made both callers **worse than before
they used the index at all**: hit test 2.97ms → 11.06ms, snapping 1.86ms → 3.31ms.

Two slots now, which is the pattern `segments()` already used — I copied it and
dropped the part that mattered.

**A handle drag called `segsDirty()` every frame**, which bumps the geometry version
and so invalidates all three caches at once. The stale entry is the one already being
ignored: the dragged object is passed to `snapPoint` as `ignore`, so its own segments
are filtered out regardless, and nothing else has moved. Invalidated **once**, when
the drag ends.

### The profiler now names a thrashing cache
A timing breakdown cannot show one — the total looks like slow work. It now compares
rebuilds against geometry changes and says so:

```
⚠ spatial index rebuilt 575 times for about 33 geometry changes
  — the cache is thrashing, not the work being expensive
```

All three from your report would have been flagged; the healthy earlier runs stay
quiet.

### Confirmed working from the same report
`handles hidden: 41444 would be drawn, over the 600 limit` — and the overlay came down
to **0.30ms from 16.00ms**. `intersection snapping limited to the 400 nearest` — no
stand-down. **DXF export 33ms** for a 2.9MB file, so that question is closed too.

715 tests.

## 3.42.0 — 2026-09-01 · build `508fd64c`

### The overlay was 16ms a frame with a large selection
```
overlay   32ms ×2  (16.00ms each)
```

Normally 0.06ms. **Two hundred times** — and the overlay is drawn fresh on every
frame, so it is the one cost no cache can skip. This is the large-group drag reported
earlier: not the geometry, the handles.

One handle per **vertex**, with no limit. A selection of 40,521 nodes drew 40,521
handles, which works out at almost exactly the 16ms measured.

Capped at **600**. Past that the selection outline does the job instead, and nothing
real is lost: on a polyline of 2,000 vertices at any ordinary zoom most handles sit on
top of one another, and you cannot grab one you cannot tell from its neighbour. So
they were unusable *and* expensive. Said once when it happens.

### SVG export: 27ms
That question is closed — it had never been timed at any size. But the same log shows
**"DXF export: 2,906,183 bytes"** with no timing at all, because I wrapped `svgOut`
and not `dxfOut`. Now timed.

### The third helper I invented today
I referenced `drawSelOutline` as though it existed. It did not — after `selectionBBox`
and `updateUndoRedo`. A name that *sounds* like it should exist is not evidence that it
does, and the only reason all three surfaced immediately is that the execution harness
runs on every release.

Written properly: it unions the selection's bounding boxes and survives an object whose
extent cannot be computed.

### And a test that read a character window
The lock-check assertion matched 800 characters from the function's name, and a comment
pushed the check past it. Reading the function body instead — the brittleness `codeOf()`
exists to avoid, in an assertion written before it was available there.

700 tests.

## 3.41.0 — 2026-09-01 · build `21c1351b`

### Viewport culling, which I had closed
```
entities off screen  73%  (1,619,223 of 2,207,550)  → culling would pay
```

I closed this item on an earlier reading of **0%**, noting in the tracker that it was
"useless HERE, not wrong in principle". A run at a closer zoom says 73%. Both
readings were true — the difference was the zoom, and the diagnostic found the case
rather than my guessing when it would arrive.

Built now, shared by all four loops that walk the drawing. Two deliberate choices:

- An object whose extent **cannot** be computed is **drawn**, not guessed away. A
  missing object is a far worse fault than a wasted draw call.
- The margin is **120 pixels**, because strokes, labels and selection haloes are
  painted outside an object's geometric box, and clipping one at the screen edge is a
  visible bug traded for an invisible saving.

### The hit test finally uses the index
2.97ms per call, second only to snapping, and the last per-interaction path still
walking every entity while the snap paths had used the index since 3.33.0. Narrowed
now — with a pass for the types the index cannot hold, and each entity tested once,
since many segments belong to one polyline.

### Intersection snapping stopped switching itself off
```
intersection snapping stood down: 24399 segments crowded near the pointer
```

Two faults. The search box was **three times the snap tolerance — nine times the
area** — for no gain, since a crossing worth snapping to is within the ordinary snap
distance. And exceeding the cap **refused** rather than trimmed, so the feature
switched off exactly where crossings are most useful.

It now keeps the **nearest 400**. The crossing anyone wants is under the pointer, so
the closest segments are the right ones, and the answer is identical in every case a
person could tell apart.

### Confirmed working
`flatten rebuild 0.13ms ×8` — the cache from 3.40.0 removed that cost entirely.
Storage warned at **57%**, as intended. Snapping down to 1.86ms from 2.59ms.

### A fault that nearly went in silently
My trim sorted by `projOnSeg(...).d2` — and `projOnSeg` returns `{p,t}` with **no
distance at all**. Every sort key would have been `undefined`, leaving the order
untouched, so the "nearest 400" would have been an arbitrary 400 and the feature would
have looked like it worked. The distance is computed explicitly.

690 tests.

## 3.40.0 — 2026-09-01 · build `60226e97`

### Decimation: the answer was no
```
points per pixel  2.3x  (4,079 points on 1,785 distinct pixels)
   → the points are distinct; decimation would only lose detail
```

I was ready to build it on the strength of "painting is the dominant cost". The
diagnostic says the painting is not wasted, so it is **not built**. That is the
whole point of a measurement that can conclude no.

Same report: at 40,310 nodes the app is now **mean 1.0ms, worst 30ms, zero slow
frames**. The 23ms means and 47 slow frames were the 79,480-node file.

### The last of the snapping cost was flattening
Snapping still measured 2.59ms per call while the index had narrowed the segment
work to **148 of 39,204**. Testing 148 segments cannot cost that, so the cost was
elsewhere — and the report held the clue: *"0 of 63,648"* entity checks over 27
rebuilds is about **2,357 entities**, not the handful I had assumed.

`flattenAll` was called twice per pointer move over all of them, and it grew its
result with `out = out.concat(...)` **inside a loop** — a new array per group,
copying everything built so far. Measured at 4.7× slower than pushing into one
array, and quadratic on nested groups.

Now it pushes, and the whole-drawing case is **cached against the geometry version**
as `segments()` is. Four other functions had the identical shape and are fixed too.
`checks.js` sweeps for it.

### Storage pressure is warned about
A real log showed **2,920KB of roughly 5MB** used, where it had been 172KB the same
morning — a saved drawing had gone in. Nothing warned: the figure appeared only in
the environment dump, which nobody reads until a write has already failed. And what
fails is saving a symbol set, a template or the autosave — work already done, lost at
the moment of keeping it.

Now checked after every write, said once at **50%** and again at **85%**, with the
figure and what to do. A refused write says so in the UI rather than only the log.

I first chose 70%, which would have said **nothing** about that 57% reading. Half
full is the point at which the next drawing may not fit, which is the decision the
warning is for — the test is what caught that.

### And the sweep read its own documentation
The new `concat` check reported a fifth site: the comment *describing* the fault, in
the function that no longer has it. Comments are stripped first now. Fourth time this
session a check has read prose instead of code.

662 tests.

## 3.39.0 — 2026-09-01 · build `67030f84`

### Creating a text object froze the whole iPad
Raising the on-screen keyboard animates the visible height over roughly 250–300ms,
firing `resize` on every frame of it. Each one:

- **reallocated the screen canvas** — assigning `cv.width` reallocates the backing
  store even when the value is identical, and during a keyboard animation the width
  never changes at all
- **allocated a brand new offscreen canvas**, because the size test replaced it rather
  than reusing it
- **repainted the whole drawing**, 45–52ms at this size

At 18.6MB per canvas that is roughly **560MB of graphics memory churned** across a
single keyboard raise. Graphics memory is not the JS heap — the OS has to find it,
which is why the whole device stalled rather than just the tab.

Three fixes:

- The canvas is only reassigned when its size **actually changed**.
- The offscreen canvas **grows and is reused**, never replaced. A buffer larger than
  the screen costs nothing to blit from, so rotating grows it once and the keyboard
  never does. The blit now names its source and destination rectangles, since a
  two-argument `drawImage` would copy an oversized buffer whole.
- While a text field has focus the repaint is **deferred to one**, after the height
  settles. Nothing needs to look right mid-animation — the keyboard is covering the
  part that moved.

### Three things I got wrong on the way
- I added a second layer of resize coalescing without checking: `debouncedResize`
  already does it at the listener. My duplicate `resizeScheduled` **would not have
  parsed**.
- I moved `textEditing` into `resize`'s condition while its `let` sat 1,000 lines
  further down — a temporal-dead-zone reference that would have thrown the moment the
  keyboard raised. **The execution harness did not catch it**, because nothing in the
  harness creates a text object. "The app loads cleanly" is not "every path works".
- Three tests then failed against correct code, because they read a function name I
  had introduced and removed in the same session.

642 tests.

## 3.38.0 — 2026-09-01 · build `e8d7c7d3`

### The build number is in the status bar
Right-hand end of the bottom bar:

```
Build  3.38.0 · <hash>
```

Both, because they answer different questions: the version says which release, the
hash says which **file** — it is computed from the file's own contents, so it changes
with every edit. After an upload, the hash is the only thing that proves the copy
being served is the one you pushed.

- **Pinned to the right**, not left to scroll away. The bar scrolls horizontally on a
  narrow screen, and a version you have to scroll to find is no better than one buried
  in a panel.
- Set **once** rather than every frame; it cannot change while the page is loaded.
- Tap it for the full details.
- **Hideable from View**, like every other status cell — it earns its place while
  uploads are being confirmed and becomes clutter afterwards, and it would be odd for
  the one cell you cannot turn off to be the one about the app rather than the drawing.

The preference is saved with the **workspace**, not the drawing: whether you want to
see a build number is about you and this browser, and storing it in the document would
carry it to whoever you sent the file to.

631 tests.

## 3.37.0 — 2026-09-01 · build `a51feb46`

### Array — repeat a selection at a spacing
`Shift+A`, or Array on the selection bar. Across and down, with the spacing defaulting
to the selection's own size so the first copy lands beside the original rather than on
top of it — the fault paste had until 3.30.0, avoided by design this time.

- Copies carry **no id** and arrive **unlocked**, as pasted ones do.
- **Connectors are left out, and it says so**: a link's position comes from its two
  ends, so a repeated one would point at nothing. Silently skipping part of a
  selection is the fault Offset had.
- Bounded by what the **drawing** can carry, not by the arithmetic: painting is
  already the dominant cost at 79,480 points, so an array adding a hundred thousand
  more is refused with the figure.

Rectangular only. Polar needs a centre, a sweep and a rotate-or-not choice — a
dialog of its own, for cases that do not come up.

52 commands.

### Two new diagnostics
**Would decimation pay?** Painting is now the dominant cost and culling cannot help —
your report shows **0% of entities off screen**, because 79,480 points live inside a
handful of polylines rather than many small objects. So the question is whether those
points land on distinct *pixels*:

```
points per pixel   12.4x  (2,204 points landing on 178 distinct pixels)
   → most of the painting is invisible; decimation would pay
```

It samples one entity per pass rather than all of them, because walking everything to
measure whether walking everything is necessary was exactly the earlier mistake. And
it can conclude no.

**Three paths that had never been profiled at all** — producing an SVG, building the
document for a save, and parsing one on load. They run once rather than per frame, so
they never appeared in a frame breakdown, but a five-second export on a large drawing
is felt as the app hanging. Reported separately, and **anything over 400ms is logged
even with profiling off**, so someone who hits it finds the reason without having had
the foresight to switch measurement on.

### Closed by measurement, not by work
`R1` state machine · `R3` viewport culling · `R7` scratch registers · the undo worker.
All four were on the list with my agreement; the device said no to each. Recorded in
`TODO.md` with the figures.

619 tests.

## 3.36.0 — 2026-09-01 · build `264d020c`

Two faults in my own spatial index, both found by a device report at 79,480 nodes.

### The index gave up at low zoom
The report said:

```
intersection snapping stood down: 38754 segments crowded near the pointer
```

38,754 is the **whole list**. At low zoom the tolerance is large in model units, so
the query box spanned more than 4,096 cells of 40mm and my fallback handed back
everything — defeating the index at exactly the zoom that needs it, and making the
message a lie about crowding.

The box is now **clamped** to 64 cells per axis rather than abandoned. A snap
tolerance covering thousands of cells is wider than anything worth snapping to, so
clamping loses nothing a person would notice, and unlike the fallback it keeps the
narrowing.

### Snapping was still 2.62ms after indexing
Because I indexed the segments and left the **vertices** walking the whole drawing.
The endpoint snap visited all 79,480 chain points and called `add()` on each, once
per pointer move.

A segment's endpoints *are* the chain vertices, so the narrowed set already holds
every vertex that could be within tolerance. Arcs and text still get their own pass —
there are few of them, because 79,480 points live inside a handful of large
polylines.

Two more per-move costs went with it:
- **A full 77,508-segment filter on every snap**, copying the list to drop the few
  objects being dragged. The exclusion happens on the narrowed set now.
- The exclusion Set was built **only above four items**, so a small drag left it
  null — and a null Set consulted from several loops silently ignores nothing, which
  means a dragged object could snap to itself.

### Confirmed working, from the same report
`index narrowing 4 of 22,948 segments per snap (0.02%)` · undo history **6 steps at
9.5MB**, against 59 steps at 78.8MB before · the autosave guard stood down at
2,329KB · the node warning fired at 79,480 · pointer state clashes still zero.

**Painting is now the dominant cost**: static rebuild 45–52ms, direct paint 65–72ms,
20% of frames over 50ms. Culling will not help — the report shows 0% of entities off
screen, because the drawing is a few very large polylines rather than many small
objects. That needs decimation within a polyline at low zoom, which is the next piece.

588 tests.

## 3.35.0 — 2026-09-01 · build `942671a5`

### Undo history is capped at 25 steps, and adjustable
A device report showed **59 steps consuming 78.8MB of an 80MB cap** — 1.33MB per step
on a 39,740-node drawing. Paying 80MB of a roughly 200–400MB tab budget to hold 59
undos nobody asked for is a poor trade, and it is the drawing that suffers when
memory runs short.

Settings → **Undo history**: keep 1–150 steps, default **25**. Saved with the
drawing, range-checked on load. Lowering it returns the memory immediately rather
than at the next action, so the figure shown stays true.

The note shows the live cost, because the trade is not decidable without it:

```
18 steps held, about 1,330KB each (23.4MB).
Fewer steps leaves more memory for the drawing.
```

It updates as you work, and costs one class check when the panel is shut.

### And it says when the bytes bite first
The **byte cap** stays as a backstop for a document where even 25 steps will not fit.
Hitting the step limit is the setting doing what it was told and needs no comment;
hitting the byte cap silently shortens how far back you can go, which nobody can
know unless told. So:

- **log**, once a session, with numbers: *"undo history is byte-limited: 12 of 25
  requested steps fit in 80MB — about 6,800KB per step"*
- **UI**, at most every two minutes: *"This drawing is large enough that only 12 undo
  steps fit in memory, not the 25 set in Settings. Save to a file before big
  changes."*

Schema at **3.35**: `undoSteps`, optional.

### Two faults the harness caught
- The state object referenced `HISTORY_DEFAULT_STEPS` before it was declared, which
  threw and **stopped the entire script**. The second time today that pattern has bitten;
  a literal is used now, kept equal to the constant by a test.
- I wrote a call to `updateUndoRedo()`, which does not exist. Hooked to `updateStatus`
  instead.

576 tests.

## 3.34.0 — 2026-09-01 · build `65e165dd`

Three separate faults behind "only the outline appears, it drags sometimes, and
sometimes it jumps". All three are mine, two from yesterday.

### Only the outline moved
The overlay draws a selected group's dashed box **fresh every frame**; the members
sat in the cached bitmap. So during a drag the box followed your finger and the
geometry stayed put — which made a rendering bug look like a selection bug. Fixed in
3.32.0 by `dragVersion`; this is the explanation.

### The jumping
3.31.0 floored the move step so a keyboard nudge could never be invisible. But
`applyMove` quantised the **drag delta** to that same floored step — **109mm at
site zoom** — so a drag advanced in jumps instead of following the finger.

One constant applied to two situations that want opposite things: a keypress is
discrete and must move something visible; a drag is continuous and must not be
quantised. They are now separate functions.

| grid | zoom | drag quantum | nudge step |
|---|---|---|---|
| 1mm | 3.1 | 1mm | 1mm |
| 1mm | 0.0092 | **1mm** | 109mm |

### "Sometimes but not always"
Hit testing needs a tap within about **11 screen pixels of a line**. On a group whose
parts are spread out, most of the dashed box is dead space — so whether a drag
started depended on whether a line happened to be under your finger.

**Selecting** still requires touching geometry. But once a group **is** selected, the
dashed box is the affordance on screen, so the whole of it drags — padding included,
so what drags is what you can see. Locked groups excluded.

That introduces a drag with no object under it, which needed guarding in two places:
replacing the selection with `[null]` would have cleared it, and a *tap* inside the
box would have hit-tested, found nothing, and deselected.

558 tests.

## 3.33.0 — 2026-09-01 · build `91933851`

### A spatial index for snapping
Two device runs at 39,740 nodes said the same thing:

```
snapping   12,804ms of ~21,400ms total  —  60% of all frame time, 3.74ms per call
locality   0.12% of 11,887 segments examined per snap were near the pointer
```

So 99.88% of the work was testing segments on the other side of the drawing. **I
declined to build this twice** on the grounds that it was premature. At 38,754
segments it is not, and the figure that settled it came from the device rather than
from me.

A uniform grid hash, cell size set from the average segment length. Measured against
brute force at your segment count:

| | per query |
|---|---|
| brute force | 29.6 ms |
| index | **0.025 ms** |
| | **1,180× faster** |

Verified for correctness first, not speed: 200 random trials confirmed it never
misses a segment brute force finds. A line spanning the whole drawing would occupy
tens of thousands of cells, so it goes in an overflow list every query checks — and
there is a test that such a line is still found.

Used by near, midpoint, perpendicular and intersection snapping. On your figures
snapping drops from **12.8 seconds to about 0.1** across the same 3,422 calls.

**Intersection snapping is no longer capped by drawing size.** It pairs only the
pointer's neighbourhood, so 8.07 billion pairs at 127,000 segments becomes a few
dozen, and the cap now bounds a local crowd (400) rather than the whole file (800).
The old message reported the wrong number anyway — "1,100 segments" on a drawing of
19,250 — and now describes what actually matters.

### Two faults of my own
- **The pooling verdict tripped on a count, not a cost.** It said "worth measuring
  further" at 20,343 objects on a run where the rebuild took **0.39ms**. Twenty
  thousand allocations costing a third of a millisecond are not an argument for
  pooling. Judged on time now.
- **The locality measurement walked every segment**, which was right as evidence for
  building the index and absurd once it existed — measuring would have cost more than
  the work measured. It now reports what the index narrows to, and can say when the
  cell size is wrong.

547 tests.

## 3.32.0 — 2026-09-01 · build `1327b47c`

### Dragging a large group moved the handles but not the lines
Exactly as described: the nodes followed the finger, the geometry stayed put, and it
caught up on release. A regression I introduced in 3.15.0 and made visible in
3.20.1.

Two different questions were sharing one counter:

| | asks |
|---|---|
| `geomVersion` | has geometry changed enough to invalidate the **segment cache**? |
| `dragVersion` | has the **picture** changed? |

`applyMove` deliberately does not bump `geomVersion` — doing so would rebuild
**19,250 segments on every frame of a drag**. But `staticKey` used `geomVersion`
alone, so during a drag the key held still, the cached bitmap of the *unmoved* lines
was blitted, and only the overlay was painted fresh. Handles moved. Lines did not.

Now a separate `dragVersion`, bumped by moves and by handle drags, and included in
the key. The segment cache is still left alone, so the reason for not bumping
`geomVersion` still holds.

**Why it appeared only now, and only on a large group:** since 3.20.1 the cache
engages only when a direct paint costs more than 6ms, and the device measured 7.2ms.
Below that threshold the cache never runs and the bug cannot occur — so a small
drawing never showed it. Using your own measured figures, a drag frame now costs
about 10.9ms against 2ms before. Correct at 90fps beats wrong at 200.

535 tests.

## 3.31.1 — 2026-09-01 · build `40c45785`

### The schema gate could pass without running
Prompted by a fair challenge about whether the gates are really running. Four of the
five were verified as refusing: `tests.js`, `checks.js`, `coverage.js` and the two
execution harnesses all return a failing exit code on a deliberately broken file.

The **schema gate did not**. It began:

```js
try{Ajv=require(...)}catch(e){process.exit(0);}
```

— a **silent pass** if the validator was absent, and another if the schema file was
missing. That is the exact fault I flagged in the CI workflow an hour earlier and
then wrote here myself: reporting success for a check that never ran.

Both now refuse. And a third hole: the gate would have passed having validated
**zero** files if the directories were unreadable, so it now requires at least twenty
of the twenty-seven shipped files to have been checked, and prints the count.

## 3.31.0 — 2026-09-01 · build `8b2dee16`

### Moving a selection did nothing at low zoom
A real log shows this **a hundred times in three seconds**, from a held arrow key,
while the object sat still:

```
Moved 1 mm — less than a pixel at this zoom.
```

The step was in **model units**. On a site plan a 1mm step is a fraction of a pixel,
so nudging and grid-snapping moved things by amounts nobody could see. Reported as
"drag doesn't work for group", and it was not about groups at all.

Every step is now floored to **at least one screen pixel**, raised in grid multiples
so it still lands on a round number:

| grid | zoom | before | after | on screen |
|---|---|---|---|---|
| 1mm | 3.1 | 1mm | 1mm | 3.1 px |
| 1mm | 0.3 | 1mm | **4mm** | 1.2 px |
| 1mm | 0.0092 | 1mm | **109mm** | 1.0 px |

"Follow the visible grid" still controls whether the step tracks the decimated grid;
this floor only stops it becoming invisible. And the warning is said **once**, not
once per keypress.

**Fifth model-versus-screen fault today**, after the sketch simplify tolerance, the
closure test, the curve judgement and the paste offset. Same shape each time.

### The profiler counted a direct paint as a blit
The report read *"blits 3625 · static rebuilds 47"* on a run where the cache was
**never in use** — 3,625 full repaints presented as 3,625 cheap copies. The opposite
of the truth, and precisely the sort of figure I would have reasoned from. Counted
and reported separately now.

527 tests.

## 3.30.0 — 2026-09-01 · build `b115a5c5`

### Paste landed underneath the original
Reported as *"copy and paste doesn't work for group"*. Driving it headlessly through
the scripting API showed that it **does** work — two groups, correct contents, fresh
ids, links carried when both ends came along.

The offset was the problem. It was **one grid step in model units**, which on a 1mm
grid at ordinary zoom is **3.1 pixels** — so the copy landed on top of the original
and nothing appeared to have happened. On the 120m site plan it was a hundredth of a
pixel.

It is now a fixed distance on **screen** — about 14 pixels — snapped to the grid so
it still lands on a round number, and never smaller than one grid step so a coarse
grid is not violated:

| grid | zoom | offset | on screen |
|---|---|---|---|
| 1mm | 3.1 | 5mm | 15.5 px |
| 1mm | 0.3 | 47mm | 14.1 px |
| 1000mm | 0.0092 | 2000mm | 18.4 px |

This is the fourth thing today that was measured in model units where it should
have been screen pixels — after the sketch simplify tolerance, the closure test and
the curve judgement. Anything a person sees should be sized in what they see.

515 tests.

## 3.29.1 — 2026-09-01 · build `99950b10`

### Copy details & log claimed success while the clipboard stayed empty
A real log shows **"Details copied."** from that button — logged only by that button
— and the clipboard was nonetheless empty, since the text had to be copied from
**View log** instead.

That is worse than a refusal. WebKit can **resolve** `writeText` and silently do
nothing once the gesture is spent, so the promise resolving is not evidence of
anything. I treated it as proof twice in one exchange: first concluding the
clipboard had worked all along and retracting a correct diagnosis, then declaring
3.29.0 a fix.

Rather than try to verify the clipboard — reading it back needs a permission prompt
— **the panel now opens every time**, whether the clipboard accepted the text or
not:

```
Also sent to the clipboard. If the paste comes out empty,
select the text here instead.
```

If the paste works, the panel is one tap to dismiss. If it does not, the text is
already in front of you. And the log records the clipboard result as
*"accepted (unverifiable)"*, which is what it actually knows.

### Advice that could not work
The same log pairs *"The browser declined"* with *"Adding the app to your Home
Screen usually changes that"* — on **Chrome for iOS**, where a home-screen shortcut
does not grant persistence at all. Advice that cannot work is worse than none: it
sends someone on an errand and spends the credit of everything else the app says.

It now branches: Safari gets the Home Screen advice; Chrome, Firefox and Edge on
iOS are told plainly that it will keep declining and to keep exporting instead.

501 tests.

## 3.29.0 — 2026-09-01 · build `a80d3a90`

### Copy details & log was failing silently on iOS
And yes, I changed it today — twice — and one of those changes is what broke it.

A clipboard write needs a **live user gesture**. WebKit treats the gesture as spent
once a promise has been awaited, and `aboutInfo()` awaits four times: a persistence
query, a storage listing, and two counts. So by the time `writeText` was called it
was rejected on every attempt.

The fallback panel opened, as designed — but **it looked identical to success**. A
panel appearing with the text in it is what you would see either way, so the button
appeared to do nothing. Three empty attachments in a row is what that looks like
from the other end.

Three paths now, in order:

1. **Claim the clipboard before any await**, supplying the text as a promise resolved
   once it is assembled. This is the only form that survives an async read on iOS.
2. `writeText`, if the first is unsupported — simpler, and fine on a desktop.
3. The panel, which always works and **now says so**: *"The clipboard refused. Select
   the text in this panel and copy it by hand."*

A refusal is logged, so the next report shows why the last one was hard to obtain.

The text is also assembled in **one** place now. It was two copies of the same twelve
lines, one per path — which is how they drift apart.

495 tests.

## 3.28.2 — 2026-09-01 · build `7cbd395d`

### "The autosave was replaced by another tab" fired twice, at the wrong moment
A real log showed it **twice in the same second**, from a listener bound once — so
either the other tab wrote the key twice or WebKit delivered the event twice.
Deduplicated within a two-second window, which is correct either way; guessing
which was not necessary to fix it.

The larger problem was **relevance**. It fired the instant a tab started, before
anything had been drawn — and a tab with nothing in it has nothing to lose. So the
warning was pure noise at exactly the moment it was most likely to be read, which is
the same fault as the ghost tab count.

Now:

| situation | what happens |
|---|---|
| empty sheet | a log line, no interruption |
| the same event twice | the second is dropped |
| you have work drawn | a note saying the drawing is safe but the autosaved copy is now theirs, and to save to a file |

### And the prose-leak check refused the first attempt
Correctly. The message interpolated `S.entities.length` inline, and the check reads
any sentence-like string for internal identifiers — which is exactly the shape that
once put *"each is now independently canSelect"* on screen. The count is held in a
variable now.

486 tests.

## 3.28.1 — 2026-08-30 · build `3438fde8`

### Adding tests is now a gate
`coverage.js`, run by `release.sh` and by CI, refusing rather than warning.

**A ratchet.** If the app's script changed, the test count must have risen. Written
because "add a test for it" is a habit that decays — over a long session it is
always the thing dropped when the fix looks obvious, and the obvious-looking fixes
are exactly the ones that came back today. Keyed on a hash of the script, so a
version bump alone does not satisfy it.

**Enumerable surfaces.** A rising count is not sufficient: the new tests could all
be about something else. So the gate also lists what can be listed exhaustively —
51 commands, 10 scripting ops, 8 storage keys, 11 blocking dialogs — and if one of
those **grew**, something new in it must be named by a test.

**A waiver, which demands a reason:**

```
COVERAGE_WAIVER="tuning a threshold, covered by existing tests" ./release.sh ...
```

printed and recorded. A gate with no escape gets disabled wholesale the first time
it is wrong; one that demands a written reason stays honest.

The baseline lives in `coverage.json` and advances **only after the gate passes** —
recording first would make it self-satisfying.

Verified by changing a constant with no new test and confirming the refusal, then
by waiving it and confirming the reason is printed.

Fourteen tests on the gate itself. Seven CI gates now: tests, structure, parse,
plan freshness, **coverage**, schema, execution.

478 tests.

## 3.28.0 — 2026-08-30 · build `90723d57`

### A headless intent API
One entry point that executes drawing operations through the **same code paths the
UI uses**. Every intent is a plain object, so it can come from a test, a pasted
script, or an agent.

```js
draftingGrid.intent({op:"circle", at:{x:0,y:0}, r:250, fill:"#c9a227", fop:0.3})
draftingGrid.intents([ ...many... ])          // all-or-nothing
draftingGrid.intent({op:"inspect"})           // read-only
```

Ten ops: line, rect, circle, text, symbol, select, command, layer, unit, inspect.
`command` reaches all 51 registry commands, so anything the toolbar can do is
scriptable.

**Why this before the state machine.** It is purely additive — no existing
behaviour changes — and it closes the gap the NaN-coordinate bug lived in for
nineteen releases: `live.js` could click buttons and dispatch pointer events, but
it could not construct geometry and then inspect what the app had stored. Three of
the new tests reproduce that exact mistake, including passing a `{p,info}` wrapper
where a point was wanted.

It also enforces two rules the UI learned the hard way: a position must be a finite
pair of numbers or the intent is refused, and every result is audited by the same
validator every import route uses — so a faulty result surfaces now rather than two
sessions later on a reload.

`intent.js` runs 21 checks in a DOM and is now a release gate.

### Two faults it found in itself
- **The API was not defined at all** on the first attempt. It captured `APP_VERSION`,
  a `const` declared further down the file, which threw *"Cannot access APP_VERSION
  before initialization"* and stopped the entire script. Read lazily now. A source
  check could not have caught this; the execution harness did.
- **I reintroduced the quadratic filter** — `includes()` inside a `filter` — in the
  select intent, within an hour of removing it from eleven other places. Caught by
  the sweep written today for exactly that.

464 tests.

## 3.27.0 — 2026-08-30 · build `a4951a41`

### Four architecture questions, instrumented rather than argued
Each of these was going to be decided on my estimate. Each is now measured on the
device, and — the part that matters — **each can come back "not needed"**. A
measurement that can only confirm what I already believe is not a measurement.

| question | what is counted | verdict it can give |
|---|---|---|
| Is a pointer state machine needed? | contradictory state combinations | *"no contradictory states seen; an FSM would be tidiness, not a fix"* |
| Would viewport culling pay? | entities entirely off screen | *"culling would save little at this zoom"* |
| Would object pooling pay? | short-lived objects per rebuild | *"too few for pooling to matter"* |
| Would a spatial index pay? | segments near the pointer vs examined | *"an index would return most of them anyway"* |

The state check is the interesting one. Nine flags — panning, band, drag, drawing,
sketching, dragSym, mid2, linking, textEditing — are **meant** to be mutually
exclusive, and nothing enforces it. A dropped `pointerup` or an aborted stylus
gesture can leave two set, which is exactly the failure an FSM removes. So it
counts them and names the combination.

The spatial index check is similarly pointed: an index only pays if most segments
examined are nowhere near the pointer. If most of them *are* near, an index returns
almost everything and saves nothing — so it reports both numbers and says which.

All gated behind Measure performance, and all reset with it, since figures carried
over from a previous run would be worse than none.

442 tests, including one per watched state and one asserting each verdict can be
reached.

## 3.26.2 — 2026-08-30 · build `68309421`

### Two of five checks were being run by hand
`release.sh` ran the test suite and the structural checks and refused on either.
The **execution harness** and the **schema validation of shipped files** I was
running manually — which means I could forget them, and eventually would. Both are
now gates that refuse.

### And the harness was missing the errors it exists to catch
Testing that, I planted a reference error inside `draw()` and **`live.js` reported
nothing**. Two reasons, both mine:

- An exception thrown inside a DOM event handler is reported by jsdom to its
  **virtual console**, not re-thrown and not reliably dispatched as a window
  error. The harness was only listening for the window event.
- An exception inside a `requestAnimationFrame` callback was thrown from a bare
  `setTimeout` and **took the whole harness down**, so it reported nothing at all
   — the opposite of its purpose.

Both fixed. On the planted error it now says:

```
notAFunction is not defined
jsdomError: Uncaught [ReferenceError: notAFunction is not defined]
in animation frame: notAFunction is not defined
```

Six tests on the gate itself, so the gate cannot quietly lose a check.

### And the new gate immediately refused a release
Correctly: `live.js` had an assertion that drawing a line changes the canvas
pixels, which reads 3 non-paper pixels on **any** build — verified earlier with a
control run against a build predating the static layer cache. Harmless as a note,
fatal as a gate, since it would refuse every release.

Removed and replaced with a printed note. An assertion that cannot distinguish a
working build from a broken one has no business being a gate.

424 tests.

## 3.26.1 — 2026-08-30 · build `bb1535fc`

### "A little off" now says how much
The message read *"the cut may land a little off where you tapped"*, which is
nothing anyone can act on — and the figure varies by four orders of magnitude:

| | message |
|---|---|
| freehand sketch, small drawing | up to **0.1 mm** from where you tapped |
| freehand sketch, campus plan | up to **40 mm** |
| hand-placed curve | up to **10 mm** |
| coarse curve at site scale | up to **1.07 m** |

No adjective could have covered that range. The app knows the number, so it states
it.

The Offset refusal now gives both figures too — the point spacing and the resulting
error — so it is clear what to change rather than only that something is wrong.

The distance is measured in **model units**, not pixels, so what you read does not
change when you zoom. Whether to warn at all is still a pixel judgement; the two
are now separate.

418 tests.

## 3.26.0 — 2026-08-30 · build `44e9b392`

### Freehand lines can be edited again
Two of my own changes met badly. 3.18.0 started marking every recognised sketch as
**curved** so it would draw smoothly; 3.7.0's curve guard then **refused Trim,
Extend and Break on all of them**. A real log shows the refusal four times in eight
seconds. Every freehand line had become uneditable.

The guard was written for a hand-placed curve with widely spaced points and applied
to everything with the flag set. Now measured rather than assumed.

A curved polyline is drawn as quadratics through segment midpoints, so the drawn
curve departs from the straight chain by at most **a quarter of the segment
length**:

| | segments | curve departs by |
|---|---|---|
| freehand sketch | 1.5px | **0.4px** |
| hand-placed curve | 40px | 10px |
| coarse curve | 200px | 50px |

And I had missed the more important point: **Trim, Extend and Break move one
endpoint.** The result is still a curved polyline, drawn smoothly through the
points that remain — the shape does not become faceted. Only the *cut* lands up to
a quarter-segment off. So refusing was wrong in every case; they now proceed, with
a word when the cut will be noticeably off.

**Offset is different and still refuses a coarse curve**, because it rebuilds every
segment at a distance rather than moving one point — so the parallel copy really
would come back faceted. A sketch is fine and now allowed.

Threshold is 2 screen pixels. Half a pixel was my first choice and it declared an
ordinary sketch "approximate" as soon as you zoomed past 4x, which is nagging about
something invisible.

412 tests.

## 3.25.0 — 2026-08-30 · build `56db874f`

### The explanations were being cut off
The Ask answers reuse `.lay`/`.nm`, a class written for a **layer row**: one short
name, no wrapping, ellipsis if long. An answer is three stacked lines of prose —
the title, how to do it, and why you would — so every one was clamped to a single
line and truncated. On a 360px panel that is about 45 characters of a sentence
that usually runs to 150, and the "why" line, which is the half normally left out
of documentation, was worst hit.

Now wraps, scoped to `#ask` so layer rows keep the single-line behaviour they
want, with rows aligned to the top since they are no longer one line.

### The content was behind the app
Every command had a button explanation, but **nine features added today had no way
to find them by asking**. A feature nobody can find is a feature that does not
exist.

Added: hiding the grid or border for a clean view · transparency · locking an
object · the node count · measuring performance · the working folder · why
autosave stopped · several tabs sharing one storage · front-to-back ordering.

62 task entries, 60 button explanations, 51 commands — and a test now asserts that
every command is explained and that each of today's features has a findable entry,
so the index cannot drift behind the app again silently.

402 tests.

## 3.24.0 — 2026-08-30 · build `650539f0`

Both of these came from reading a log rather than from testing.

### Ghost tabs
A real log showed the tab count climbing **3, 4, 5, 6, 7, 8, 9 in thirteen
seconds**, then settling at 2 a minute later. Nobody opened nine tabs: a **reload**
gets a fresh tab id, and the old entry lived for the full 30-second expiry. Six
quick reloads reported seven tabs, six of them dead.

That matters because the warning is about a real hazard — two tabs sharing one
storage, last save wins — and a warning that cries wolf gets ignored. It also
meant "the autosave was replaced by another tab" could come from a tab that no
longer existed.

- A tab now **deregisters on `pagehide`**, so a reload leaves no ghost at all.
  `pagehide` rather than `unload`, because iOS Safari does not reliably fire
  `unload`; and synchronous, because an async write during teardown may not
  complete.
- The beat is **4s against a 12s expiry** — three missed beats before a tab is
  presumed gone, which tolerates a backgrounded tab without keeping a closed one
  alive for half a minute.

### The shared log now says which tab wrote each line
The log lives in `localStorage` and every tab writes to the same one. That is
deliberate — a crash in one tab should be readable from another — but a copied log
mixed builds with no way to tell them apart. A real log held env dumps from
**3.21.1 and 3.23.0 interleaved**, and reading it I could not tell which tab had
produced the report.

Every line now carries a two-character tab mark, and the banner and *Copy details*
both say which mark is the current tab:

```
20:07:41 a4 [debug] env: build 3.21.1 (61116e89)
20:08:39 7c [debug] env: build 3.23.0 (8ad059c1)
this tab: 7c
```

384 tests.

## 3.23.1 — 2026-08-30 · build `2ced6bd8`

### The storage figure was misleading
A real log read:

```
quota about 39322MB, used about 0KB
```

— on a browser holding ten symbol sets, nine templates and an active autosave.
`navigator.storage.estimate()` covers the Storage API family (Cache, IndexedDB,
OPFS) and **Safari does not count `localStorage` in it**, which is where all of
that actually lives. So the line said "39GB free, using none" while the real
budget was the ~5MB `localStorage` limit.

That is the sort of figure a decision gets based on. The app now measures its own
keys directly, which is exact and cheap:

```
browser storage: about 190KB used across 21 keys, of roughly 5MB available
Storage API quota 39322MB, used 0KB — this covers IndexedDB and caches,
  NOT the localStorage where sets and templates live
```

Doubled for two-byte characters, since that is what the 5MB budget counts. The
estimate is still reported, labelled for what it actually covers rather than left
to be misread.

372 tests.

## 3.23.0 — 2026-08-30 · build `8ad059c1`

### Offset says what it works on, and why it refused

| works | refused, with the reason |
|---|---|
| open polyline | **a curved polyline** — offsetting would not follow what you see |
| closed polygon | text — no outline to offset |
| rectangle | a group — ungroup it first, then offset the parts |
| circle | a connector — it follows its objects rather than having a shape |
| arc | a dimension — not geometry |

Also refused: inward by more than the shape has to give, which was already
handled.

Two faults behind "it doesn't work on all elements":

- **A curved polyline was accepted and offset against its underlying corner
  points**, so the result did not follow the curve on screen. Silently wrong is
  worse than refused, and it is the same fault Trim had until 3.7.0. Now refused,
  with the remedy: turn the curve off in Style first.
- **An ineligible object in a mixed selection was skipped in silence.** Select a
  group and a line and the line offset while the group vanished from
  consideration with no word at all. Now: *"Offset 1 object, left 1 alone: a group
  — ungroup it first."*

And when nothing can be offset, it names **your** object rather than reciting what
Offset does and leaving you to work out which of yours is the problem.

Help gains a troubleshooting entry, ordered so that "offset" reaches the how-to and
"offset won't work" reaches the explanation.

366 tests.

## 3.22.1 — 2026-08-30 · build `8965518f`

Two data-corruption bugs, both found in a real log rather than by testing:

```
opening "a drawing": dropped item 23 — text at a non-numeric position
This drawing has a problem: 1 link pointing at nothing.
```

### Dragging a symbol wrote NaN coordinates
`snapPoint` returns `{p,info}`. Every caller unwraps it; **the drag path passed the
whole wrapper**, so `at.x` was `undefined` and `translateObj` produced `{NaN,NaN}`
for every part of the symbol.

The object drew as nothing, saved as nothing usable, and was dropped on the *next*
load — so the failure surfaced hours later, in a different session, reported as a
different thing. **Every symbol placed by dragging since 3.3.0 was corrupt.**

`placeSymbol` now refuses a position that is not a finite pair of numbers, logs it
and says so. A silent NaN is why this survived so long.

### A symbol containing a link produced a dangling link
Links carry object **ids**, and an id from the drawing the symbol was built in
means nothing in the drawing it is placed into — so placing one left a connector
pointing at an object that was never there. This was item **B2** on the tracker and
it has now been observed in the wild.

Links are now dropped on placement, with a word: *"Placed 'Firewall' without 1
connector: a link cannot be carried between drawings."* A symbol that is nothing
but a link is refused outright, and the refusal leaves no empty undo step.

353 tests.

## 3.22.0 — 2026-08-30 · build `d9fb579c`

### The Ask panel scrolls, so the walkthroughs are reachable
`#askBody` had `overflow-y:auto` but no `min-height:0`. A flex child does not
shrink below its content size unless that permits it, so there was nothing to
scroll: the body expanded to its full content height and the panel clipped it with
`overflow:hidden`. **The walkthroughs sit at the bottom of that content**, so they
were simply unreachable.

`#helpBody` and `#panelBody` had the identical omission, hidden only because their
content happened to be shorter. All three fixed.

### The symbol list scrolls, and dragging works with it
- **The list had no scroll container at all.** 25 symbols in a set overflowed the
  panel with nowhere to go, so anything past the fold was unreachable — the same
  fault as the Ask panel, in a different place.
- **Rows used `touch-action:none`**, so a touch anywhere in the list started a
  potential drag and the list could not be scrolled by touch. Now `pan-y`.
- **Direction decides.** A mostly-vertical movement is a scroll and is handed back
  to the browser; a horizontal one starts the drag. Otherwise the first thing
  anyone does in a long list is drag a symbol onto the sheet by accident.

Drag-to-place itself has existed since 3.3.0 — it was unusable because the list it
lives in could not be scrolled.

### A check I wrote and removed
I added a `checks.js` sweep for the flex-scroll fault. It **reported a pass on a
file with the fault present, and named a sibling** for a fault in another element —
wrong in both directions, because a regex cannot reliably associate a CSS rule with
its element. Removed, with the reason recorded in the file.

An unreliable check is worse than none, because it gets believed. That is exactly
how the hidden-layer performance conclusion happened. Replaced with explicit tests
asserting each of the three containers declares `min-height:0`, verified by removing
it in a copy and confirming the suite fails.

344 tests.

## 3.21.2 — 2026-08-30 · build `e60bbe91`

### Settings could not be closed by tapping outside
The canvas guard **returned silently** when a blocking dialog was open. It was
there for a good reason — without it, tapping beside an open Save menu added a
shape to the sheet — but it discarded the tap rather than acting on it, so tapping
the canvas to dismiss the panel did nothing.

On a wide screen, which includes iPad in landscape, that left **no way to close it
by tapping at all**: Settings docks as a real grid column rather than an overlay,
so there is deliberately no scrim to receive an outside tap. Escape and the close
button still worked, and Escape does not exist on a tablet keyboard.

A canvas tap now dismisses. Still no drawing input — it closes and returns.
Reproduced in both viewport cases before and after.

### And three dialogs were never dismissable at all
**Board, Resize and Offset** were listed in `BLOCKING_MODALS` but never closed by
`closeBlockingModals`. Each already had a closer; none was being called. So an
outside tap was swallowed by the guard and the dialog stayed open.

`checks.js` now verifies that every blocking dialog is closed, matching on the id
*or* its toggle function — some close via `toggleSaveMenu(false)` rather than by
id, and checking only the id reported two false positives.

## 3.21.1 — 2026-08-30 · build `61116e89`

### Reports name the device
A figure without a device is unattributable, and the right strategy differs by
hardware — a threshold that suits a tablet may be wrong on a phone. Every report
now opens with:

```
device: iPad · Chrome on iOS (WebKit) · OS 26.5 · 1180×820 css, 2x dpr
        · canvas 2360×1640 device px · 8 cores · 5 touch points
```

Reported, not inferred. **The model is not guessed at** — it is not knowable from
a browser. The one ambiguity that is resolvable is handled: recent iPadOS reports
itself as *Macintosh*, and touch points tell the two apart.

### Reports survive
The log is capped at 400 lines and *Copy details & log* takes the last 120 — so a
report taken while a problem was happening, followed by drawing, was pushed out of
both. Exactly the report you would want.

The last **three** reports are now kept separately, written to storage, restored on
reload, and always included in a copy.

### Three faults found while doing it
- **`logEnvironment()` was never called at startup.** An earlier aborted patch
  removed it, so the environment block only ever appeared when Detailed logging was
  switched on by hand. The working-folder handle was not restored either.
- **The new storage key was not reserved from migration.** The migration that once
  destroyed the symbol sets treats any unlisted `dg:` key as a stray drawing — so
  `PERF_KEY`, the second storage probe, and `LEGACY_LIB_KEY` would all have been
  eaten. All reserved.
- **`checks.js` now verifies this**, distinguishing a `*_KEY` (a single slot) from a
  `*_PREFIX` (a namespace, covered by a separate list). Verified by removing
  `PERF_KEY` from the list in a copy and confirming the check fails.

335 tests.

## 3.21.0 — 2026-08-30 · build `3f9bfd88`

Three fixes from a code review, taken in measured order of cost.

### Intersection snapping is capped
Every segment against every other, on **every pointer move**. At 127,000 segments
that is **8.07 billion pairs — measured at 186 seconds per move.** The app would
not have been slow, it would never have returned. And it was one Settings checkbox
away, with nothing in between.

Now limited to **800 segments**, which measures at about 7ms — inside a frame with
room for the drawing itself. Above that it stands down for the drawing, says so
once, and **every other kind of snapping keeps working**.

My first choice was 2,000, which measured at 46ms — three frames. Plausible in
isolation and not something to build a limit around.

### Wheel and pinch coalesce their redraws
Both called `draw()` synchronously on every hardware event, and a trackpad emits
hundreds a second. Now `requestDraw()`, so one paint per frame rather than one per
event. Zero risk, and `pointermove` was already doing this.

### Element lookups are cached
`updateStatus` alone makes **32 `getElementById` calls and runs every frame** — a
drag paid nearly two thousand DOM queries a second for elements that never change
identity. 613 call sites now go through a cache.

Cached carefully rather than resolved once at startup, because many of these
elements are created later: a **miss is not cached**, so an element that appears
later is found next time, and a **disconnected element is looked up again** rather
than served stale.

### Declined, with reasons
- **Dirty flags instead of the `staticKey` string** — measured at 0.00ms, and since
  3.20.1 it only runs when the cache is in use, which is never on a light drawing.
- **Delta-based undo history** — per-command inverses are where editors acquire
  subtle bugs. A size ceiling or a worker preserves a model that has never produced
  a wrong undo.
- **Change-detection on every DOM write** — unproven, and more state to keep
  correct. The profiler can say whether it matters on the device first.

319 tests.

## 3.20.1 — 2026-08-30 · build `9d07cdd4`

### Fixes a regression I introduced in 3.15.0
The static layer cache was applied **unconditionally**, and it is not free: a blit
is a `clearRect` plus a full-surface `drawImage` — about **15MB of pixel copy** at
retina density — and that cost is identical whether the drawing holds 47,000
canvas operations or three.

Two situations where it loses, both of which it was applied to anyway:

- **A light drawing.** Painting a grid and a few objects is cheaper than copying
  the whole surface, so an almost-empty sheet became *slower than no cache at all*.
  That is the sluggishness reported with very little on the canvas.
- **Any drag, pan or zoom.** The key changes every frame, so the offscreen was
  repainted *and* blitted — strictly more work than painting straight to the
  screen, on every frame of every drag, at any drawing size.

The cache now has to earn its place, measured at runtime from the paints it does
anyway:

| situation | cache |
|---|---|
| light drawing, still | not used |
| light drawing, dragging | not used |
| heavy drawing, dragging | not used |
| **heavy drawing, still** | **used** — 460ms per 60 frames against 4,200ms |

- Skipped whenever the picture differs from the previous frame, which is what a
  drag, pan and zoom all do.
- **No offscreen canvas is created at all** for a light drawing, so it costs
  neither the memory nor the copy.
- The rebuild feeds the same measurement, so a drawing that gets lighter switches
  the cache off again.

A run counter was my first attempt at detecting the thrash and it oscillated —
decaying back to zero after two direct frames, re-enabling, thrashing again, and
paying both costs on half the frames of a drag. Comparing against the previous
frame's key has no such oscillation.

The profiler now reports whether the cache is in use and the measured direct-paint
time, so "not in use" on a light sheet reads as correct rather than as a fault.

302 tests.

## 3.20.0 — 2026-08-30 · build `a8508593`

### Join — split lines can be reconnected
There was **no way to do this**. Split, Break and Explode all cut a line into
pieces, and none of them had an inverse: Group has Ungroup, but Split had nothing.
Undo puts a split back, but only immediately and not once you have drawn since.

**Merge** was the obvious candidate and is unrelated — it makes a *group*
permanent. Its message never said so, and now does: *"Merge makes a GROUP
permanent — it does not join lines. To reconnect split lines, use Join."*

**Join** is on the selection bar and bound to `Shift+M`.

- Ends must **meet**, within 8 screen pixels — the same condition that held when
  the pieces were cut apart. Anything looser would weld lines that merely pass
  near each other.
- **Orientation does not matter.** Split gives no guarantee which way round a
  piece runs, so all four end pairings are tried.
- **Chained**, so five sides of a rectangle become one shape in a single command
  rather than joining pairwise four times.
- If the two far ends also meet, the result is a **closed shape** rather than a
  line with coincident ends.
- Separate chains stay separate, and pieces whose ends do not meet are **reported
  rather than silently dropped**.
- Open polylines only. A closed shape has no free ends and a circle has nothing to
  join — saying so beats appearing to do nothing.

Help now distinguishes the two meanings of "join": *Join two objects with a
connector that follows them* (Link) and *Join split lines back into one*. Searching
the bare word offers both; adding a word resolves it.

51 commands. 292 tests.

## 3.19.0 — 2026-08-30 · build `d2241633`

### Loop closure is configurable
Settings → **Freehand sketch**. Whether a stroke was meant as a loop is a
judgement, and the automatic answer will sometimes be wrong.

- **Decide for me** — from the geometry, as 3.18.0 does, with the tolerance
  adjustable: *closes within N% of the stroke*, default 12%. Lower is stricter.
- **Always open** — every stroke stays an open line, however it ends.
- **Close if it wraps** — anything that curls back becomes a closed shape.

**A straight line is never closed, whatever the setting.** Closing one produces a
degenerate shape rather than what was asked for, so the wrap condition applies in
every mode.

Saved with the drawing, so a sheet of freehand annotation keeps the behaviour it
was drawn with. An old file, or an unrecognised value, falls back to *Decide for
me* — opening an existing drawing must not silently change how sketching works.
A saved tolerance is range-checked on load.

Schema at **3.19**: `sketchClose` and `closeTol`, both optional. All 27 shipped
files still validate, an invalid mode is rejected, and an out-of-range tolerance
is rejected.

Also fixed a stale comment: the closure constant still described itself as a
fraction of the bounding diagonal, which it stopped being in 3.18.0.

277 tests.

## 3.18.1 — 2026-08-30 · build `075f4275`

### The text field can be cancelled
It could only be cancelled with **Escape**, and an iPad on-screen keyboard has no
Escape key — so on the device this app is mainly used on, there was no way out.
Worse, every other exit went through `onblur`, which **committed**: tapping away,
dismissing the keyboard, or tapping a toolbar button all saved. Opening an
existing label to read it and tapping away rewrote it.

- **✓ and ✕ buttons** beside the field. Escape and Enter still work for anyone
  with a keyboard.
- The buttons use `pointerdown` with `preventDefault`, because `click` arrives
  *after* blur and blur is what commits — otherwise Cancel would have committed
  before its own handler ran.
- Blur still commits when it was not the buttons that caused it, so tapping the
  canvas to place the next label keeps what you typed.

### And clearing works
An empty entry was treated as a mis-tap and silently ignored — right for a new
object, wrong for an existing one, since emptying the box is how anyone removes a
label. Now:

- Clearing a **label** removes it.
- Clearing a **text object** removes the object, rather than leaving something
  invisible that cannot be tapped and still counts as geometry.
- Creating still ignores an empty entry, so a stray tap leaves nothing behind.

264 tests.

## 3.18.0 — 2026-08-30 · build `97f2dc40`

Two outstanding sketch questions, both with real faults behind them.

### Why a sketch forced the loop closed
The test was `end-to-end gap < 0.58 × the bounding diagonal`. **0.58 of the
diagonal is more than half the size of the whole stroke** — a C, a hook, or
anything that curled back at all was over the line. That is why nearly every
freehand stroke came back as "Closed shape".

It was also scale-relative: on a stroke drawn across a 120m site, finishing
within **70 metres** of the start counted as a deliberate loop.

Now judged against the stroke's own **path length**, at 0.12, with a second
condition that the path must actually wrap round — the length must exceed 1.6×
the direct distance across it, since two ends can be close simply because a
stroke is short.

| stroke | before | now |
|---|---|---|
| full circle | closed | closed |
| nearly-full circle | closed | closed |
| **a C** | **closed** | **open** |
| gentle arc | open | open |
| straight line | open | open |

### How close together the nodes are
Three separate causes, all reading as jaggedness:

- **Capture** was a point every 2 CSS pixels — **4 physical pixels** on a retina
  screen, and points are joined by straight lines, so a curve was faceted every 4
  device pixels. Now one point per **device** pixel, so the same smoothness on any
  display density.
- **Simplify** discarded points with a tolerance of 0.025 × the bounding diagonal.
  On a curve across the campus plan that threw away **every point within three
  metres** of the line between its neighbours. Now **1.5 screen pixels**, so the
  simplification is invisible at the zoom you drew at, whatever the drawing scale.
  On that plan the tolerance drops from 3000mm to 163mm.
- **Render**: the result was a plain polyline. It now sets `curve:true`, using
  machinery the app already had — so the surviving points are joined smoothly
  rather than by straight segments.

The extra captured points cost nothing lasting: the simplify pass reclaims most of
them. They exist so the curve *through* them is accurate.

252 tests.

## 3.17.2 — 2026-08-30 · build `a5e09a6f`

### A failed static cache can no longer blank the screen
The offscreen canvas added in 3.15.0 is a second backing store — about 15MB at
retina density — and **iOS can refuse to allocate one under memory pressure**. If
`createElement("canvas")` failed, or the blit threw, `draw()` threw with it and
nothing would be painted at all.

It now falls back to painting directly, permanently, and logs why. Slower is
usable; blank is not. This was found by trying to execute the app rather than
read it, which is the first time in this session anything has been run.

### `live.js` — executes the app instead of reading it
Loads the page in jsdom with a real 2D canvas, dispatches pointer events, and
clicks every toolbar button. Confirms on the current build: **loads with no
error, obtains a context, all 58 toolbar buttons click without throwing, pointer
events dispatch without throwing.**

It does **not** verify that anything correct was painted. Pixel inspection reads
3 non-paper pixels on any build, and a control run against a build that predates
the static cache gives the identical figure — so the blankness is jsdom's canvas
plumbing, not the app. Any pixel assertion would be measuring the harness, and
the file says so at the foot rather than leaving a misleading green tick.

## 3.17.1 — 2026-08-30 · build `a8744df0`

The scale bar read **"20000 mm"** on a 120m site. It assembled its label by hand
from the raw number and the unit, so it bypassed the scaling formatter added in
3.11.0 — and a sweep found **thirteen** other places doing the same.

Now scaled, including two that end up on the printed drawing:

| | before | after |
|---|---|---|
| scale bar | 20000 mm | **20 m** |
| dimension on the sheet | 44000 mm | **44 m** |
| area label on the sheet | 9,600,000,000 mm² | **9,600 m²** |
| perimeter label | P 400000 mm | **P 400 m** |
| symbol size in the palette | 1800x4500 mm | **1.80 m × 4.50 m** |
| a 900mm door | 900 mm | 900 mm |

Also the SVG export's dimension and area labels, the Trimmed, Extended, Offset,
Resized and Board messages, the midpoint helper, the live length readout and the
nudge message.

The test **sweeps the source** for any label built by hand rather than checking
the ones I happened to think of — which is how the scale bar was missed in the
first place. 3.11.0 fixed the status bar and I assumed that was all of them.

237 tests.

## 3.17.0 — 2026-08-30 · build `69a87361`

### A profiler, because every figure so far came from the wrong machine
Settings → About → **Diagnostics**: *Measure performance*, *Report now*,
*Reset counters*. The report goes to the log, so it comes back with
**Copy details & log**.

Frame time is counted **always** — two clock reads per frame is nothing, and the
mean frame time is the one number that says whether any of this matters on the
device in hand. The per-phase breakdown only accumulates while measurement is on.

Timed phases: **static rebuild**, **overlay**, **status bar**, **segments
rebuild**, **snapping**, **hit test**, **undo snapshot** (with its size in MB).
Snapping and hit testing are timed by wrapping rather than by editing each exit —
`snapPoint` has seven returns, and adding a `profEnd` to each is the sort of
change that gets one wrong and reports nonsense.

**The useful part is why, not how long.** When the static cache rebuilds, the
profiler names which key term changed:

```
static cache rebuilt because these changed:
   selection             ×412
   geometry              ×3
```

That distinguishes a cache working correctly from one thrashing, which no timing
alone can. Each of the eleven terms is tested to name itself correctly.

Memory in the report: undo history in steps and MB against its cap, canvas
backing stores, visible and hidden node counts, segment list length, and the JS
heap where the browser offers one — named as unavailable rather than omitted
where it does not, which is Safari.

A frame over 50ms reports itself, at most once every four seconds.

232 tests.

## 3.16.0 — 2026-08-30 · build `c60d37b1`

### The Nodes cell counts what is drawn, not what is in the file
- It reported the file total. Hidden layers are skipped by both hot paths, so on
  `stress-test.json` as it loads the cell read **131,532 while the app was drawing
  132**. That is the number that led me to a performance conclusion from a test
  where 99.9% of the drawing was hidden.
- It now reads the **visible** count, with the hidden figure alongside so a large
  file is not mistaken for a small one:

```
132  +131,400 hidden      as the stress file loads
131,532                   all layers on
```

- The caution thresholds now apply to the visible figure, which is the only one
  that predicts cost.
- The environment log reports both, in objects and nodes, since reporting only the
  total is exactly what misled the earlier testing.
- Visibility is tested once per top-level object rather than per child: a group
  shares one layer, so testing per child would multiply a linear find over the
  layer list by the node count.
- Eight tests, including the one that would have caught the original fault.

212 tests.

## 3.15.0 — 2026-08-30 · build `316362b4`

### A redraw is now a blit
Toolbar taps were sluggish with all layers on, which pointed away from the canvas
— tapping a button changes nothing on the sheet. Tracing showed `setTool` calls
`draw()`, and `draw()` was issuing about **47,000 canvas operations** on a large
drawing: 29,117 hatch strokes, 6,670 strokes, 2,400 arcs, 1,500 fills, 1,220 clip
regions and 800 text layouts. Every redraw paid all of it.

- The geometry is now painted once into an **offscreen canvas** and blitted
  thereafter. An unchanged frame is one `drawImage` instead of 47,000 operations.
- The overlay — handles, rubber band, previews, snap marks, scale bar — is drawn
  fresh on top each frame, because that is what genuinely changes.
- A rebuild happens only when the picture would actually differ: geometry, view,
  canvas size, selection, layer visibility or colour, the view toggles, the unit,
  the grid.
- Export bypasses the cache, since an export must not be a blit of a
  screen-sized bitmap.

The cache **key** is the correctness argument, and two terms were missing on my
first attempt — both would have shown as a stale picture:

- **Selection keyed by count** rather than identity. Selecting a different single
  object left length and first index unchanged, so the halo would not have moved.
- **Layer colour**, which is the fallback for any object without its own colour
  and does not bump the geometry version.

Nineteen tests, one per key term.

204 tests.

## 3.14.0 — 2026-08-30 · build `5219bc67`

The sluggishness with all layers on — a second per interaction at 131,532 nodes,
when the same file with one layer visible had been fine — was two things, one of
them mine.

### segments() was rebuilt on every pointer move
- **The single most expensive thing in the app at scale**: 127,083 segment objects
  allocated and **58ms per call**, and `snapPoint` calls it on every move. Sixty
  of those a second is not possible, so moves queued and everything lagged.
- Now cached against a geometry version counter. A cache hit is **0.0001ms**.
- Keyed on a version rather than cleared on redraw. Clearing it in `draw()` was
  the obvious move and useless — `draw()` also runs on every pointer move, so the
  cache would never survive a frame.
- Invalidated by `push()`, `restore()`, the layer visibility toggles and the drag
  path. A stale list would snap to where an object used to be, so the invalidation
  being complete is the whole correctness argument.

### The node counter was walking the drawing every frame — my regression
- I added it in 3.10.0 with a comment claiming it was counted on change, and a
  test asserting `nodesUI` was absent from `draw()`. **Both were true of the
  letter and false of the fact**: `draw()` calls `updateStatus()`, and
  `updateStatus()` called `nodesUI()`. One level of indirection defeated the test
  entirely. 0.78ms over 131,532 nodes, sixty times a second.
- The whole-drawing total is now cached against the same geometry version. The
  selection count still recomputes, being small and needing to be current.
- **The test now follows the call graph** rather than one function body, and asks
  whether the expensive walk is *guarded* rather than whether it is *reachable* —
  it is reachable, and legitimately so.

185 tests.

## 3.13.0 — 2026-08-30 · build `60c2edd4`

Found by testing with **all layers on** — 5,370 objects, copied four times to
21,480 objects. Grouping them all froze the screen.
Earlier testing had only one layer visible, so the earlier "no practical ceiling"
conclusion was wrong.

### Quadratic removal
- `removeObjects` used `includes()` inside a `filter` — a linear scan of the list
  per element. Removing 21,480 objects was **400 million comparisons, three times
  over**, measured at 225ms. A `Set` does the same work in 3ms.
- Ten more call sites had the same shape, including Offset, Reorder, Ungroup,
  Explode and Split. All converted, and a test now sweeps the source so the
  eleventh cannot appear quietly.
- Grouping cloned **every object individually** — 21,480 separate JSON
  round-trips, 338ms. It now clones the array once.

### Undo history capped by bytes
- Was 150 steps regardless of size. 150 steps of an 18MB document is **2.7GB**;
  150 steps of an ordinary drawing is a few megabytes. A step count cannot tell
  those apart, so the cap is now **80MB of history**, oldest discarded first, with
  at least one step always kept.
- On your stress file that is about four steps; on a 40KB drawing it is still the
  full 150.

### Memory, as far as a browser will say
- **The history size is now tracked exactly** and shown in Settings → About and in
  the environment log. It is exact because the app builds those strings itself.
- `performance.memory` is reported where it exists, and named as unavailable where
  it does not. Which is Safari, so on iPad there is no heap figure — and the two
  alternatives do not help either: `measureUserAgentSpecificMemory` needs
  cross-origin isolation headers GitHub Pages cannot set, and
  `navigator.storage.estimate` reports disk rather than RAM.

### Still outstanding
`push()` serialises the whole document on **every** undoable action — measured at
1,193ms for an 18MB document, and the largest single cost in that freeze. That
needs a decision rather than a patch.

> **Correction:** the earlier claim that snapshot undo was "vindicated" by fast
> undo at scale was wrong twice over — the test ran with 99.9% of the drawing
> hidden, and it measured *restoring* a snapshot (one `JSON.parse`) rather than
> *recording* one (a full stringify of the whole document). Recording is the
> expensive half, and it runs on every action.

176 tests.

## 3.12.2 — 2026-08-30 · build `9f104966`

The autosave guard did log and notify, but had two holes.

- **It serialised before measuring.** A 3.6MB drawing was turned into JSON every
  2.5 seconds and thrown away — avoiding the storage write while keeping the cost
  that made the write a bad idea. It now gates on the node count first, at roughly
  30 bytes a node, and only serialises when that is worth doing. The byte check
  still runs afterwards for cases the estimate misses.
- **A storage refusal was swallowed by an empty catch.** A drawing *under* the
  limit can still fail because the symbol sets, templates and browser slots have
  used the budget — and it failed silently, with the Settings panel still reading
  "Last kept 2 minutes ago". Both causes are now logged, notified once, and named
  in the panel: "Not saving — the browser's storage is full. Save to a file."
- Each cause is said once, so a repeating failure does not repeat the message.

164 tests.

## 3.12.1 — 2026-08-30 · build `858dfe72`

- **The Grid cell keeps its original shape.** The grid interval leads, because
  that is the setting you chose; 3.11.0 had reversed them, which was worse.
- The second figure is now named **"view interval"** rather than left as an
  unexplained "(showing 10000)". It says what it is, and it is the term a drawing
  office would use.
- Both figures go through the scaling formatter, so a view interval reads as
  **10 m** rather than 10000.

```
1 mm  ·  view interval 10 mm          zoomed in
1 mm  ·  view interval 10 m           zoomed out
1 m                                   no decimation, nothing extra shown
1 mm  ·  view interval: too fine to draw
```

161 tests.

## 3.12.0 — 2026-08-30 · build `aaac42be`

A 1,052-node site plan was reported as showing no strain on an iPad, which
disproved my thresholds and produced two fixes.

> **Correction, added later.** The stress testing that followed this entry was
> done with only one layer visible, and hidden layers are skipped by both drawing
> and snapping — so 99.9% of the drawing was never processed. Any conclusion in
> this entry or the next about how much the app can handle was measured on the
> wrong configuration. See 3.14.0 and `TODO.md` for the corrected figures.

### Node thresholds raised
- Caution **8,000 → 25,000**, warning **25,000 → 75,000**. The originals were
  guesses set far too low, and a caution that fires on a drawing running
  perfectly teaches you to ignore it. Still provisional — `stress-test.json`
  exists to replace them with a figure measured on the device.

### Autosave stands down on a large drawing
- Found while building the stress file: it is **3.65MB**, and autosave rewrites
  the *whole document* every few seconds against a browser store of about 5MB.
  It would have spent the entire budget on repeated copies of itself and then
  begun failing — taking the symbol sets and templates with it.
- Above **1.5MB** autosave stops, says so once, and the Settings panel explains
  why rather than leaving a stale "last kept" reading as though it were working.
  Saving to a file is unaffected.
- Checked on payload bytes, not entity count: one curved polyline can outweigh a
  hundred straight lines.

159 tests.

## 3.11.0 — 2026-08-30 · build `ee9d1d33`

### The grid cell says what it means
- It read **"1000 × 1000 mm (showing 10000)"** and never said which number was
  which. The second figure is the interval **actually being drawn**: the app steps
  up by tens when your chosen interval would fall closer than four pixels, because
  a grid finer than that is neither readable nor cheap to draw. The interval you
  set is unchanged, and snapping still uses it.
- Now: **"drawn every 10 m · set to 1 m"** — what is in front of you first, the
  setting named as a setting. The tooltip explains the fallback, and when the grid
  is too fine to draw at all it says so rather than reporting a number.
- The arithmetic was correct throughout. I traced it and found no error; one of my
  own test cases suggested a bug at extreme zoom and the test was wrong, not the
  app.

### Large values read sensibly
- A 120m site in millimetres gave **9,600,000,000 mm²** for its area and 118000
  for a cursor position. Correct, and nobody recognises their own site in that
  form.
- Position, length, perimeter, area and both grid intervals now show in whichever
  related unit keeps the number in a sensible range, with the unit named. The
  stored millimetres never change.
- **Small things stay small**: a 900mm door still reads 900 mm. The switch happens
  at 1000mm, or 100cm, or 24in. Pixels are left alone — there is no larger unit.

| cell | before | after |
|---|---|---|
| X | 118000 | 118 m |
| Length | 44000 mm | 44 m |
| Area | 9,600,000,000 mm² | 9,600 m² |
| Perimeter | 400000 mm | 400 m |
| Grid | 1000 × 1000 mm (showing 10000) | drawn every 10 m · set to 1 m |

152 tests.

## 3.10.0 — 2026-08-30 · build `09851641`

### Node count in the status bar
- A **Nodes** cell showing points in the drawing, and "N of M" when something is
  selected.
- **Points, not objects**, because points are what cost: six imported symbols can
  hold more geometry than a hundred hand-drawn lines. A rectangle counts four, a
  circle one, a group the sum of its contents, a link its ends plus waypoints.
- **Caution at 8,000 points, warning at 25,000** — amber then red on the value,
  with the reason in the tooltip. The heavy warning is said once per session, not
  on every redraw.
- **Counted on change, never per frame.** `draw()` runs on every pointer move
  during a drag, and walking the whole drawing sixty times a second to update a
  label would be the very cost the counter exists to warn about. Asserted by test.
- Measured before choosing the thresholds: the JavaScript side — transforms,
  iteration, bounding boxes — is **1ms for 100,000 points**, about 7% of a frame.
  The budget goes on rasterisation, which cannot be measured off-device. So the
  thresholds are stated as a caution rather than a measurement, and the count is
  visible at all times so it can be correlated with what actually feels slow.
- Thirteen tests.

### Test harness
- Assertions on source text now extract a **whole function body by balancing
  braces** rather than taking a fixed number of characters after the declaration.
  Three tests in a row had failed on correct code because a comment pushed the
  asserted line past a 400-character window. Widening the window was a patch;
  reading the actual body is the fix.

141 tests.

## 3.9.0 — 2026-08-30 · build `5371010f`

Both faults below were found by reading a real hand-made drawing rather than a
generated one. Neither would have shown up in the samples, because a script never
draws a nearly-straight corner or explodes an arc.

### Mitre spike in Offset
- The drawing contained stray points **a thousand units outside everything else**
  — 1283,699 and 1679,-754 among coordinates that were otherwise within ±900.
- Cause: the mitre join. The parallel guard only catches segments that are
  *exactly* parallel; measured, a **179° join puts the corner 1,146 units away**
  and 179.9° puts it 11,459 away. That is a mitre spike, the known failure mode
  of an unlimited mitre.
- Now capped at four times the offset distance, past which the join bevels rather
  than spikes. A right angle is still mitred exactly as before — the limit must
  not change joins that were already fine. Nine tests.

### Full float precision in generated geometry
- The same drawing held points like `-42.7905731119443, 54.519550080342796`, from
  an exploded arc — about 120 of them.
- The format reference asks for 4 decimal places and the SVG importer already
  rounded; nothing else did. Explode, break, circle trim, sketch recognition,
  offset and the freehand arc now all round.
- 4dp is a ten-thousandth of a millimetre, far finer than anything drawable, and
  **56% less text per point**.

128 tests.

## 3.8.1 — 2026-08-30 · build `340e722a`

Found by reading a usage log rather than a bug report.

### An internal name reached the screen
- **"Split into 6 segments — each is now independently canSelect and can be
  deleted on its own."** My blanket rename of `editable` to `canSelect` rewrote
  four sentences the user reads, and this one shipped. All four repaired.
- The same rename also **downgraded two gates from strict to permissive**: Resize
  and Label would have acted on a locked object.
- `checks.js` now **checks prose**: no internal identifier may appear in a `note()`
  or in any sentence-like string. An identifier rename must not touch text, and
  the only reliable guard is to check the text.

### Messages that cost four minutes
The log shows 52 trim and extend attempts and 11 successes. The geometry was
working throughout; the messages were not.
- **"Nothing crosses that line"** fired 20 times. Trim cuts *between* crossings;
  cutting at a point is Break — and the message never said so. It suggested Erase,
  which deletes the whole object. It now points at Break.
- **"Extend works on an open line"** fired 8 times without saying what it had
  found. It now names it: "That is a rectangle, which has no free end to extend."
- The missed-tap message is clearer about what "the outline" means.

### A test that punished an improvement
- One test quoted the missed-tap sentence verbatim, so rewording it — the very
  change the test exists to encourage — failed the suite and refused the release.
  It now asserts that *something* is said, not what.

### Tracker
- **`TODO.md`** — every known bug, the log findings, the code review assessed
  against measurements, features, what has never been examined, and the three
  recurring fault patterns.

## 3.8.0 — 2026-08-30 · build `002aa187`

### A command that needs a selection now switches to Select
- It used to switch **only when nothing was selected**, so reaching for Resize
  while the Line tool was active ran the command and left you on Line — unable to
  drag what you had just resized, and with the next tap starting a line. All 14
  selection commands now switch either way.

### Long press on empty canvas
- Press and hold on an empty part of the sheet for your **five most-used
  commands**, appearing under the finger that asked for them.
- Ranked from the same usage counts that drive "Most used first" in Settings, so
  it reflects every session rather than a guess. Before there is any history it
  offers Line, Rect, Circle, Text, Measure — an empty menu would be worse than a
  sensible default.
- Commands you have hidden stay hidden; it is not a back door to them.
- Deliberately narrow about when it fires: only on empty canvas, only when no
  shape is part-drawn, not during a drag, cancelled by movement of more than nine
  pixels, and cancelled by a second finger so a pinch is still a pinch. Escape
  closes it, and so does opening any panel.
- Thirteen tests over the ranking and the guards. 113 tests.

## 3.7.1 — 2026-08-30 · build `4f538e2a`

Trim did work on a polygon — the geometry was right all along. Two things made it
look otherwise.

- **A missed tap said nothing.** An unfilled closed shape is only its outline, so
  tapping inside it hits nothing, and the tool returned in silence. That reads
  exactly as "it does not work on polygons". It now says: tap the outline itself,
  on a closed shape the edge and not the space inside it.
- **A trimmed closed shape came back as two pieces.** A closed shape has no ends,
  so removing one span should leave a single run passing through the seam — the
  arbitrary point where the point list happens to begin. Keeping the two halves
  separately put a break there that had nothing to do with where you cut, and it
  was invisible until you tried to move one of them. Now one contiguous piece.
- Seven tests on a hexagon, including that the remainder is one piece and that the
  join is contiguous. 100 tests.

## 3.7.0 — 2026-08-30 · build `41c531d6`

### Trim now works on a circle
- Tap the part of a circle you want gone and it becomes an arc. The direction is
  **derived, not assumed**: crossing angles are sorted around the circle and the
  gap containing your tap is the piece removed, so the sweep sign is a consequence
  of the walk rather than a guess. Getting that wrong silently keeps the piece you
  wanted removed, which is why it was left out originally.
- Thirteen tests, including both wraparound directions and unequal splits, all
  asserting which piece **survives**. Segment-against-circle is tested separately
  for chords, tangents, misses, and segments ending inside.

### Refusals are now honest
- **A curved polyline was accepted and trimmed against its corner points**, so the
  result did not follow the curve on screen. Silently wrong is worse than refused;
  it now says to turn the curve off in Style first.
- Trim, Extend and Break share one target test, so the three cannot drift apart on
  what they accept. Each refusal says what to do instead.
- Trimming an arc further, and breaking or extending a curve, still refuse — with
  the reason, rather than doing nothing.

93 tests.

## 3.6.5 — 2026-08-30 · build `64972fde`

- **To front and To back had near-identical icons.** Different code points, but
  upward and downward arrows to a bar look the same at toolbar size — and both
  sit outside common iOS font coverage, so a missing glyph would have rendered
  the *same fallback box* for each. Now a solid block and a light block: different
  fills, obvious at any size, and legible even if one substitutes. Forward and
  Backward stay as filled and hollow triangles, which also distinguishes "all the
  way" from "one step".
- **Two more pairs had the same fault and were already shipping:** Trim and
  Extend (⊣ / ⊢) and Group and Ungroup (⊞ / ⊟). Now scissors and an arrow-to-bar,
  and a bracketed set versus stacked bars.
- **`checks.js` now tests for lookalike glyphs**, not just duplicates. Related
  commands must not use codepoints within two of each other in the same block —
  adjacent codepoints are usually the same shape mirrored or rotated, which is
  exactly the trap. It found all three pairs on its first run, including the
  replacement I had just chosen.
- The comment explaining the icon choices had to move outside the object: the
  icons are read as JSON by `checks.js`, so a comment inside it breaks the parse.

## 3.6.4 — 2026-08-30 · build `241ab1aa`

Renames the two permission gates again, to names that need no explaining. No
behaviour change.

`selectable()` and `editable()` removed the outright lie of the original pair, but
still asked you to remember which of two adjectives was the strict one — and
"editable" still sounds like it covers everything.

- **`canSelect(o)`** — the layer allows it.
- **`canModify(o)`** — also not locked as an object.

Read as questions, they cannot be muddled: if what you want to know is "may I
change this", the answer is `canModify`, and no other name suggests itself.

22 canSelect sites, 12 canModify. Both tests were rechecked by reverting a gate
in a copy — one catches reorder, the other catches delete — because the blanket
rename had inverted the patterns the tests search for, so they were briefly
flagging the correct code and ignoring the wrong.

## 3.6.3 — 2026-08-30 · build `e3fa5721`

Renames the two permission gates to say what they decide. No behaviour change.

The old pair was `editable()` and `changeable()`. `editable()` gated **selection**
and `changeable()` gated editing — so the function whose name said "editable" was
the one that did **not** mean editable, and anyone reaching for the obvious name
got the permissive gate. That is exactly how nine call sites came to let a locked
object through, and it would have happened again with the next change.

Now:

- **`selectable(o)`** — the layer allows it. A hidden or locked layer puts its
  objects out of reach entirely; the way back is the layer row in Settings.
- **`editable(o)`** — also not locked as an object. A locked object stays
  selectable, because the padlock is the only way to unlock it.

22 selectable sites, 12 editable. Every function that decides what an operation
acts on now uses `editable`, which finally means what it says. Verified by
reverting one gate in a copy and confirming the suite fails and names it.

## 3.6.2 — 2026-08-30 · build `f85f40d5`

- **Reorder acted on a locked object.** `orderTargets` still used the permissive
  gate, so To front and To back moved something locked. The last of the paths
  that bypassed the guard.
- **A test for the rule as a whole**, rather than one per function: every
  function that decides what an operation acts on must use the strict gate. That
  is what found reorder; reading the code had not.
- The test now **strips comments before asserting**. The word "changeable"
  appearing in a comment satisfied it, so reverting the gate still passed — the
  third time a test of mine has asserted on prose rather than code. Verified by
  reverting the fix in a copy and confirming the suite fails and names the
  function.

The rule is now: **locked means the only thing you can do is unlock.** Select by
tapping it (a rubber band and Select all skip it, so a sweep never collects what
you protected), then the padlock. Nothing else — move, nudge, handles, delete,
restyle, resize, rotate, mirror, group, reorder — touches it.

## 3.6.1 — 2026-08-30 · build `8c5d65e2`

Keeping a locked object selectable did cause problems elsewhere. A systematic
sweep of every function that mutates the selection found six that bypassed the
guard entirely:

- **Delete removed a locked object.** It filtered on the layer gate, and the
  Delete key reaches it without passing the funnel where the lock was enforced.
- **Arrow-key nudge moved it**, for the same reason.
- **Rotate, mirror, group and resize** likewise.
- **Handles were drawn on it**, inviting a drag that was then refused — which
  reads as the app being broken rather than the object being protected.
- **Select all and the rubber band swept it in**, so every command afterwards
  reported "4 of the selected are locked and were left alone" for something you
  never chose. Both now leave locked objects out; selecting one deliberately
  still works, which is what the padlock needs.
- **A pasted copy inherited the lock**, so you pasted something you could not
  then move into place. Copies arrive unlocked; the lock protected that object,
  not the idea of it.

Eyeballing found three of these. A scripted sweep found the rest, and it is now a
test — the next mutator added will forget too. 79 tests.

## 3.6.0 — 2026-08-30 · build `5a5078fa`

### Lock an individual object
- A **Lock** button on the selection bar. Locking was per layer only, so
  protecting one object meant giving it a layer of its own.
- **A locked object stays selectable, and nothing else.** It cannot be moved,
  resized, styled, offset, trimmed, reordered, grouped or deleted. Staying
  selectable is the whole design: the padlock is the only way back out, so making
  it unselectable would leave no way to unlock it.
- The button says what it will do and what is true now — Lock, Unlock, or
  Unlock all for a mixed selection.
- A selected locked object gets an **amber halo** instead of the usual blue, so
  "why won't this move" is answerable at a glance.
- A mixed selection is **reported, not silently halved**: "3 of the selected
  objects are locked and were left alone."
- The Style panel still **shows** a locked object's colour, weight and pattern.
  Look without being able to change.
- Two gates, deliberately distinct: `editable()` is the layer (hidden or locked
  layers put objects out of reach entirely), `changeable()` adds the object lock.
- Schema is at 3.6. Eleven tests over the lock rules; 75 tests now.

### Fixes
- My blanket rename of `styleTargets` to `writeTargets` caught `syncStylePanel`
  too, which would have shown an **empty Style panel** for a locked object — the
  panel looking broken rather than the object looking protected.
- One new test matched a *comment* that mentioned `syncStylePanel` rather than the
  function, so it asserted on prose and would have passed whatever the code did.

## 3.5.0 — 2026-08-30 · build `45c1e46d`

### Front to back
- **To front**, **To back**, **Forward**, **Backward**. Draw order is array order
  — the last object is painted last and sits on top — and until now the only way
  to change it was to delete something and draw it again.
- **To front** and **To back** are on the selection bar; all four are commands
  with shortcuts (`Shift+F`, `Shift+G`, `Shift+H`, `Shift+J`).
- **Relative order within a selection is preserved.** Bringing three overlapping
  objects forward should not shuffle them against each other.
- **Forward and backward move one step among objects that actually overlap**, not
  one position in the array. Stepping past something on the far side of the sheet
  looks like the command did nothing, and you would tap it twenty times wondering
  why.
- A step that changes nothing does not leave an empty undo entry.
- Six tests over the ordering rules. 64 tests now.

### Fixes
- The four new shortcuts initially collided with Rotate and Flip, which already
  own the bracket keys — caught by the duplicate-shortcut check.
- Help keyword collisions: "send to back" returned the DXF export, and "on top of"
  returned the link-port entry. 17 of 17 phrasings land correctly now.

## 3.4.1 — 2026-08-30 · build `175bed1d`

- **Fill on a text object now works.** `drawText` never read the field, so the
  swatch set it and nothing was drawn. A fill on text is a background panel
  behind the lettering — for a label sitting on a hatched wall or a busy drawing,
  readable because it masks what is underneath. It rotates and mirrors with the
  text and is padded to match the selection outline.
- The same gap existed in **SVG export**, which would have been worse: it looks
  right on screen and wrong when someone else opens it.
- Text also missed **object and fill opacity**, for the same reason — it takes its
  own path through the renderer, so anything added to entities generally has to
  be added to text separately.
- The Style note said fill has no effect except on closed shapes. It now mentions
  text, and stops appearing when text is what is selected.
- Six tests added over the text path specifically, since that is where this class
  of omission keeps happening. 58 tests now.

## 3.4.0 — 2026-08-30 · build `111ef9b9`

### Grid cell is interactive
- Tap **Grid** in the status bar to set the interval and the heavy-line spacing
  without opening Settings. It shows what the heavy line works out to in real
  units, offers sensible intervals for the current unit, and can lock or unlock
  X and Y. Settings stays in step, so the two never disagree.

### Transparency
- **op** and **fop** on every entity: the whole object, and the fill within it.
  They multiply, so a shaded zone can sit under a solid outline — which a single
  whole-object opacity cannot do.
- Two sliders in **Style → Transparency**, applied live. The fill slider is
  hidden where there is no fill to dim.
- Stored as its own field rather than an alpha baked into the colour hex: it
  survives a colour change and maps straight onto SVG's `opacity` and
  `fill-opacity`, so export needs no conversion. Absent means opaque, so every
  existing drawing is unaffected.
- DXF cannot carry it and now says so alongside the other four things it drops.
- Schema is at 3.4.

### Fixes
- **The View popover could not open.** Its `.open` rule was never added when the
  popover was, so it had every style except visibility.

### Tests
- 52 automated tests now, covering opacity and the grid rules.
- The test extractor mishandled a multi-line arrow `const`, truncating it
  mid-function, and `const` declared inside `eval` does not reach the test scope.
  Both fixed — a helper that silently extracted wrong would have been testing
  something other than the app.

## 3.3.1 — 2026-08-30 · build `d7a1b4b1`

Testing, made permanent rather than ad hoc.

- **`tests.js`** — 38 automated tests over the geometry and validation: resize,
  offset, trim, break, entity faults, and the shipped files. Each was written
  after something went wrong and then thrown away once it passed, which is why
  the same faults came back. They now run in the terminal instead of on the iPad.
  Verified by reintroducing three real bugs from this session — the inverted
  offset winding, hatch spacing not scaling, and `isFinite(null)` — and confirming
  all three fail the suite.
- **`testplan.js` and `TEST-PLAN.md`** — the manual plan is generated from
  `index.html`, so it cannot claim coverage of a control that no longer exists or
  miss one added yesterday. It covers all 46 commands, every dialog and its
  controls, all twelve file paths, the behaviours that have broken before, and a
  device matrix. The generator **refuses to emit an incomplete plan**: matching on
  a shortcut silently dropped Merge, which has none.
- `release.sh` now runs the tests and the checks, and refuses on either.
- CI runs both, and fails if `TEST-PLAN.md` is stale.

## 3.3.0 — 2026-08-30 · build `2ebe45dc`

### View toggles where you can reach them
- A **View** cell in the status bar, beside Layer, with Grid, Sheet border,
  Title block, Object labels and Dimensions. One tap each, always visible.
  These were only in Settings, several sections down — the wrong place for
  something you flick on and off while drawing.
- The title block cannot be shown without its border, so that option is disabled
  rather than silently doing nothing.
- The cell summarises what is off, e.g. "no grid, no dims".

### Symbols panel
- **Draggable and narrowable**, like the toolbars. Put it down one side, and
  narrow it to names only when the sizes are in the way.
- **Drag a symbol onto the sheet** to place it. Place-then-tap still works, and
  is easier one-handed, but dragging is one gesture instead of three. A drag only
  starts after the pointer moves, so a tap is still a tap.
- **Delete has moved behind an Edit library button**, with a confirmation, and
  **Rename** is added. Delete sat one tap from Place with no confirmation, and it
  destroyed a library entry rather than anything in the drawing. Placing a symbol
  is something you do fifty times an hour; removing one is something you do twice
  a year.

### Fixes
- The **Choose a folder** and **Clear** buttons in Settings did nothing — the
  patch that added them aborted before its handler block landed.
- `checks.js` gains a **dead-control check**: every button and field must be
  referenced by the script. The existing check only looked for elements the
  script reaches for; nothing looked for controls that reach for nothing.

## 3.2.0 — 2026-08-30 · build `bd3f558c`

- **Saving now uses the best route the device actually offers**, decided by
  capability rather than guessed from the user agent:
  1. straight into a working folder, if one is set;
  2. the system Save dialog (`showSaveFilePicker`), where the browser has one —
     you choose the folder and it is remembered between saves;
  3. the Share Sheet on touch devices, as before;
  4. an `<a download>` anchor everywhere else.
  All ten save paths go through the one function, so this applies to drawings,
  SVG, PNG, DXF, libraries, layers and the setup export alike.
- **Working folder** — Settings gains the section on browsers with a file-system
  API. Set it once and saving writes into it with no dialog. The handle is kept
  in IndexedDB, because a directory handle is a live object and cannot be stored
  as text. Permission is re-requested at the first save after a launch, not at
  startup: a permission prompt with no context is one people refuse.
- The section is **hidden where the API does not exist**, which is every browser
  on iOS, rather than shown and broken.

## 3.1.8 — 2026-08-30 · build `aaeadcf3`

- The environment block now reports whether the browser can offer a **working
  folder** (`showDirectoryPicker`). It is the capability that decides whether the
  app can be pointed at a folder on disk or has to ask every time, and it is
  absent on every browser on iOS.

## 3.1.7 — 2026-08-29 · build `f9d8b4df`

- **Fixes the Settings panel layout.** The log-level control was added using
  markup the panel does not use anywhere else — a segmented row nested inside a
  labelled row — which broke the spacing of the About section. It now follows the
  same shape as every other segmented control in the panel.
- **Adds `checks.js`, run by `release.sh`, which refuses to publish if it fails.**
  A syntax check could not have caught the above: the file parsed, every id
  existed, every function worked. What was wrong was that it did not match its
  surroundings. The checks test consistency with what is already there —
  labelled rows have a field, segrows are not nested, every command has an icon
  and a colour, toolbar orders match the declared commands, no storage call
  bypasses the logging wrapper, and no workspace setting is restored without
  also being saved.

## 3.1.6 — 2026-08-29 · build `6bec82b6`

- **Logging is configurable** — Settings → About → Off, Normal, Detailed.
  - *Off* records errors only. An error is rare, cheap, and the one thing you
    always want kept; a log that discards the crash is worse than no log.
  - *Normal* is the default: errors, warnings and what you did.
  - *Detailed* adds the full environment block and per-key detail.
  - The level is checked **before any string is built**, so a detailed message
    costs nothing when the level is low. Verified: a thousand detailed messages
    at Off build zero strings.
  - The setting is saved with the workspace and restored quietly on launch.
- The startup environment dump is now one line at Normal and the full block only
  at Detailed.

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
