# Update → 3.47.0

Ten files. Everything else in the repo is unchanged.
Upload all ten: `https://github.com/lballaty/OpenGraph/upload/main`

`index.html` · `CHANGELOG.md` · `tests.js` (780) · `checks.js` · `coverage.json`
`TEST-PLAN.md` · `TODO.md` · `drafting-grid.schema.json` · `NAMING.md` · `release.sh`

## Every known bug is now closed

| | |
|---|---|
| **B6 arc trim** | fixed. A middle cut is refused with a reason, since it would leave two arcs |
| **B5 panel positions** | fixed. Help, Ask and Symbols remember where you put them |
| **B4 reorder in a group** | explained: a group reorders as a whole, the parts need Ungroup |
| **B3 grid outside undo** | not a bug. View settings are not work, and the reasoning is recorded next to the code |

Plus, in the two releases before this one: layer edits are undoable, the floating bar's
top button is reachable, and a dimension label can be dragged.

## What is left is not a bug list

**F1 drawing scale** is the one structural gap: a sheet is real millimetres, so a plan
at 1:50 has no way to say so. Everything works around it.

Then three surfaces nobody has tested: phone layout below 1366px, keyboard and screen
reader use, and printing against an actual ruler.

## Worth exercising in this build

- **Trim an arc** where something crosses it — from an end, and from the middle.
- **Drag the Ask or Symbols panel** somewhere, close it, reopen it.
- **Rotate the iPad** afterwards; the panel should be clamped back on screen, not lost
  off the side.
