# Update → 3.42.0

Ten files. Everything else in the repo is unchanged.

| file | needed? |
|---|---|
| `index.html` | **yes** — the app |
| `CHANGELOG.md` | yes |
| `tests.js` | 700 tests |
| `checks.js` | the concat sweep |
| `coverage.json` | **yes** — the ratchet's baseline |
| `TEST-PLAN.md` | yes, CI diffs it |
| `TODO.md` | what the data closed and reopened |
| `drafting-grid.schema.json` | schema 3.35 |
| `NAMING.md` | the naming convention |
| `release.sh` | only if you run releases yourself |

Upload all ten: `https://github.com/lballaty/OpenGraph/upload/main`

## What your last report found

**The overlay was 16ms a frame** with a large selection, where it is normally 0.06 —
two hundred times, and the overlay is redrawn every frame regardless of any cache. The
cause was one handle per vertex with no limit: 40,521 nodes selected meant 40,521
handles. That is the large-group drag you reported days ago; it was never the geometry.

Capped at 600, with the outline taking over past that. Nothing real is lost — beyond a
few hundred the handles overlap each other and cannot be grabbed individually anyway.

**SVG export is 27ms.** That question is closed. **DXF was not timed at all** — your
log shows a 2.9MB export with no figure, because I had wrapped only the SVG path. Now
timed, so the next report will say.

## Worth trying, in rough order of what would tell us most

1. **Select everything on a large drawing and drag it.** That is the path this release
   changes. Expect the outline rather than handles, and a note saying why.
2. **Create a text object** on a large drawing — the 3.39.0 freeze fix, still untested.
3. **Rotate the iPad** with a drawing open. Stale pixels at an edge would be the sign
   I got the buffer growth wrong.
4. **Zoom in and pan** — the culling path. An object vanishing near the edge is the
   failure mode.
5. **DXF export** while measuring, now that it reports a time.
