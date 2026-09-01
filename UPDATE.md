# Update → 3.44.0

Ten files. Everything else in the repo is unchanged.

| file | needed? |
|---|---|
| `index.html` | **yes** — the app |
| `CHANGELOG.md` | yes |
| `tests.js` | 726 tests |
| `checks.js` | unchanged since 3.40.0, include for safety |
| `coverage.json` | **yes** — the ratchet's baseline |
| `TEST-PLAN.md` | yes, CI diffs it |
| `TODO.md` | what the data closed and reopened |
| `drafting-grid.schema.json` | schema 3.35 |
| `NAMING.md` | the naming convention |
| `release.sh` | only if you run releases yourself |

Upload all ten: `https://github.com/lballaty/OpenGraph/upload/main`

## The handle problem

Both tolerances were 22px on touch and handles are tested first — but a vertex sits ON
the object, so a press near a corner was inside both and the handle always won. Under
about 100px across, every point is within 22px of a vertex, so a small object could
only be resized, never moved.

Handle tolerance is now 13px on touch against the object's 22. Plus two cases the
tolerance alone does not fix: more than three handles within reach defers to moving,
and an object too small to offer both actions defers and tells you to zoom in.

## How to think about it now

- Press **near a corner** of a reasonably sized object → grabs that corner.
- Press **anywhere else on it** → drags.
- **Dense polyline or tiny object** → drags, because no single point can be meant.
