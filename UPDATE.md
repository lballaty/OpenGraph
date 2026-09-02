# Update → 3.55.0

Ten files. Upload all ten: `https://github.com/lballaty/OpenGraph/upload/main`

## Symbols

**The drag was genuinely broken.** The test separating a drag from a list scroll was
`|dy| > |dx|`, so any gesture aimed *below* the symbol was thrown away — and from a
side panel, most of the sheet is below. It is a cone now: flicks up and down still
scroll, anything aimed at the paper drags.

**The panel shows thumbnails**, drawn with the same renderer the sheet uses.

**The Place button is gone.** You asked why it existed when the row can be tapped and
dragged; there was no good answer. Tap the row to arm, drag to place directly.

**Keep the panel open while placing** — a checkbox on the panel itself.

## Bars across a rotation

One position meant rotating clamped it and overwrote your choice. Two slots now, one per
orientation, size included.

## Worth checking

- Drag a symbol out of the panel towards the middle of the sheet. That is the exact
  gesture that failed.
- Tick **Keep the panel open** and place several in a row.
- Put the bars where you want them in landscape, rotate to portrait, arrange there, and
  rotate back.
