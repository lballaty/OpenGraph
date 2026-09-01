# Update → 3.48.1

Ten files. Everything else in the repo is unchanged.
Upload all ten: `https://github.com/lballaty/OpenGraph/upload/main`

## The vanishing dimension label

A dimension is drawn offset from the two points it measures — that offset line and its
label are what you see, but the bounding box covered only the measured points. Wrong
from the start, and it never mattered until viewport culling arrived in 3.41.0. Zoomed
out nothing is culled; zoom in and the cull drops dimensions whose measured line has
left the view while the visible one has not.

Same fault for an object label dragged far from its object.

I first widened the cull margin instead. At 200px it considers 87% more area than the
screen against 73% of objects being off it — most of the saving handed back to cover
something measurable. Reverted, and the reasoning is recorded next to the constant.

## Also in this bundle, if not yet loaded

- **3.48.0** Select and Undo pinned so they cannot scroll out of reach
- **3.47.0** arc trimming, panel positions, group reorder message
- **3.46.0** a dimension label can be dragged
- **3.45.x** floating bar top button, layer edits undoable

## Worth checking

**Zoom right in on a dimension** and pan so the measured points leave the screen while
the label does not. That is the exact case.
