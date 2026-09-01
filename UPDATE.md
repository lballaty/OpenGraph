# Update → 3.40.0

Ten files. Everything else in the repo is unchanged.

| file | needed? |
|---|---|
| `index.html` | **yes** — the app |
| `CHANGELOG.md` | yes |
| `tests.js` | 662 tests |
| `checks.js` | new sweep for concat-in-a-loop |
| `coverage.json` | **yes** — the ratchet's baseline |
| `TEST-PLAN.md` | yes, CI diffs it |
| `TODO.md` | what the device data closed |
| `drafting-grid.schema.json` | schema 3.35 |
| `NAMING.md` | the naming convention |
| `release.sh` | only if you run releases yourself |

Upload all ten: `https://github.com/lballaty/OpenGraph/upload/main`

## Your report decided three things

**Decimation: no.** `points per pixel 2.3x` — the points are distinct, so the painting
is not wasted. I was ready to build it; the measurement says do not, and it is not
built.

**The last of the snapping cost was flattening**, not segments. 2.59ms per snap while
the index tested 148 of 39,204 — the cost was `flattenAll`, called twice per pointer
move over ~2,357 entities, growing its array with `concat` inside a loop. Now pushed
and cached. Four other functions had the same shape.

**Storage was at 2,920KB of ~5MB** and nothing warned. Now warned at 50% and 85%.

## Also worth knowing

At 40,310 nodes your last run was **mean 1.0ms, worst 30ms, zero slow frames**. The
slow figures were the 79,480-node file. Snapping should now be a fraction of what it
was even there.

## Still worth trying

- **Create a text object** on the large drawing — the freeze fix from 3.39.0 is
  untested.
- **Rotate the iPad** with a drawing open — the offscreen buffer now grows on rotation.
- An **Export SVG** while measuring. That path has still never been timed; the report
  shows `building the document 0ms` but no export.
