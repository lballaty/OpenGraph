# Changelog

The **This build** line in Settings → About is a hash of the file's own contents.
Two copies showing the same one are the same file. Use it to tell builds apart —
the version number alone will not, since several ship on the same date.

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
