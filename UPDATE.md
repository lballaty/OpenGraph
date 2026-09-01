# Update → 3.37.0

Nine files. Everything else in the repo is unchanged.

| file | needed? |
|---|---|
| `index.html` | **yes** — the app |
| `CHANGELOG.md` | yes |
| `tests.js` | 619 tests |
| `coverage.json` | **yes** — the ratchet's baseline |
| `TEST-PLAN.md` | yes, CI diffs it |
| `TODO.md` | records what the device data closed |
| `drafting-grid.schema.json` | schema 3.35 |
| `NAMING.md` | the file-naming convention |
| `release.sh` | only if you run releases yourself |

Upload all nine: `https://github.com/lballaty/OpenGraph/upload/main`

## New in this release

**Array** — `Shift+A`, or Array on the selection bar. Across and down, spacing
defaulting to the selection's own size so the first copy lands beside the original.
Connectors are left out and it says so. Refused if it would add more points than the
drawing can carry.

**Two diagnostics**, both able to conclude "not needed":

- **points per pixel** — whether decimation would pay. Culling cannot help here (0% of
  entities off screen, because your points live in a few large polylines), so the real
  question is whether the points land on distinct pixels.
- **one-off operations** — SVG export, building a document, opening one. These run once
  rather than per frame, so they never appeared in a frame breakdown, and anything over
  400ms is now logged even with profiling off.

## What to send back

One report after working on a large drawing. The line that matters:

```
points per pixel   12.4x  (2,204 points landing on 178 distinct pixels)
```

Above about 4x and decimation is worth building — it would be the last of the
performance work. Near 1x and I should not build it, and painting needs a different
answer.

Also worth trying an **Export SVG** while measuring, since that path has never been
timed on a real drawing.
