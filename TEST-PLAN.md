# Test plan

Generated from `index.html` — version **3.37.0**, build **`a51feb46`**.
Regenerate with `node testplan.js index.html > TEST-PLAN.md` after any change.

Automated coverage is in `tests.js` (`node tests.js`). Everything below needs a real
device: the logic can be tested headlessly, but layout, gestures, pickers and storage
cannot.

## How to use it

Work down the list on the device. Anything that fails, note the build hash from the
foot of the **?** panel and the relevant lines from **About → Copy details & log**.

## Commands — 52 total

Each should: respond to its button, respond to its shortcut, and appear in the help
search under its own name.

| Command | Bar | Key | Does | ✓ |
|---|---|---|---|---|
| Select | 1 | `v` | Picks things up so you can move, style or delete them. |  |
| Erase | 1 | `e` | Rubs out whatever you tap. |  |
| Trim | 1 | `shift+t` | Cuts a line back to the nearest thing that crosses it. |  |
| Extend | 1 | `shift+e` | Lengthens the end you tap until it meets the next thing in its path. |  |
| Break | 1 | `shift+k` | Cuts a line in two wherever you tap it. |  |
| Line | 1 | `l` | Draws a line, or a run of joined lines, tap by tap. |  |
| Rect | 1 | `r` | Draws a box from one corner to the other. |  |
| Circle | 1 | `c` | Draws a circle from the middle outwards. |  |
| Arc | 1 | `a` | Draws part of a circle — a curve between two points. |  |
| Half | 1 | `h` | Draws a half circle in one go. |  |
| Polygon | 1 | `n` | Draws a shape with equal sides — a hexagon, triangle, octagon. |  |
| Link | 1 | `w` | Joins two things with a line that stays attached when either moves. |  |
| Text | 1 | `x` | Writes words on the drawing wherever you tap. |  |
| Measure | 1 | `m` | Shows how long or how wide something is, with the number on the drawing. |  |
| Sketch | 1 | `k` | Lets you draw freehand, then tidies it into a proper shape. |  |
| Mid 2pts | 1 | `d` | Finds the exact middle between two points you tap. |  |
| Pan | 1 | `g` | Slides the sheet around without drawing anything. |  |
| Snap | 1 | `s` | Makes points jump to grid lines, ends, middles and crossings. |  |
| Ortho | 1 | `o` | Forces every line to run straight across or straight up. |  |
| Polar | 1 | `p` | Forces lines to set angles — every 15°, or whatever you choose. |  |
| Type value | 2 | `t` | Lets you type an exact length or angle instead of dragging. |  |
| Finish | 2 | `enter` | Ends the line you are drawing and keeps it open. |  |
| Close shape | 2 | `shift+enter` | Joins the shape back to its first point, or closes one you already drew. |  |
| Cancel | 2 | `escape` | Throws away the line you are part-way through. |  |
| Undo | 2 | `meta+z` | Takes back the last thing you did. |  |
| Redo | 2 | `meta+shift+z` | Puts back something you just undid. |  |
| Delete | 2 | `delete` | Removes whatever is selected. |  |
| Select all | 2 | `meta+a` | Selects everything on the drawing. |  |
| Copy | 2 | `meta+c` | Takes a copy of what is selected. |  |
| Paste | 2 | `meta+v` | Drops the copy down, slightly offset. |  |
| Group | 2 | `meta+g` | Sticks several things together so they move as one. |  |
| Ungroup | 2 | `meta+shift+g` | Breaks a group back into its parts. |  |
| Board | 1 | `shift+b` | Draws a board outline at a size you give, with a hole pattern. |  |
| Symbols | 1 | `b` | Your library of shapes you can stamp down again. |  |
| Label | 2 | `q` | Attaches a name to a thing, so the name moves with it. |  |
| Split | 2 | `i` | Cuts a line wherever another line crosses it. |  |
| Offset | 2 | `shift+o` | Makes a parallel copy at a set distance. Works on lines, polylines, rectangles, circles and arcs — not on text, groups, connectors, dimensions or a line drawn as a curve. |  |
| To front | 2 | `shift+f` | Moves the selection in front of everything else. |  |
| To back | 2 | `shift+g` | Moves the selection behind everything else. |  |
| Forward | 2 | `shift+h` | Moves the selection one step forward, past the next thing it overlaps. |  |
| Backward | 2 | `shift+j` | Moves the selection one step back, behind the next thing it overlaps. |  |
| Resize | 2 | `shift+s` | Resizes the selection by a factor, or to a width or height you type. |  |
| Explode | 2 | `j` | Breaks a shape into its separate edges. |  |
| Array | 2 | `shift+a` | Repeats the selection at a spacing, across and down. |  |
| Join | 2 | `shift+m` | Reconnects split or broken lines into one, where their ends meet. |  |
| Merge | 2 | none | Locks a group so it cannot be broken apart by accident. |  |
| Fit | 2 | `f` | Zooms so you can see everything — or just what is selected. |  |
| Full screen | 2 | `f11` | Hides the bars so the sheet fills the screen. |  |
| Save | 2 | `meta+s` | Opens the ways of keeping the drawing: file, picture, print, or in this browser. |  |
| Open | 2 | `meta+o` | Opens a drawing, a template, or brings in an SVG. |  |
| Help | 2 | `?` | This guide, the search, and every shortcut and icon. |  |
| Settings | 2 | `,` | Grid, units, layers, snapping, sheet, autosave and toolbars. |  |

## Panels and dialogs

### ask  · `#ask`

| Control | Type | Test | ✓ |
|---|---|---|---|
| ☰ | button | tap it; it acts and does not throw |  |
| ✕ | button | tap it; it acts and does not throw |  |
| `askVer` | button | tap it; it acts and does not throw |  |
| `howAsk` | text | typing applies; empty is handled |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### help  · `#help`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Close | button | tap it; it acts and does not throw |  |
| Restore defaults | button | tap it; it acts and does not throw |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### num  · `#num`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Place point | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `nA` | number | a valid number applies; letters and a negative are refused |  |
| `nB` | number | a valid number applies; letters and a negative are refused |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Rotate  · `#transform`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Apply | button | tap it; it acts and does not throw |  |
| ↔ Horizontal | button | tap it; it acts and does not throw |  |
| ↕ Vertical | button | tap it; it acts and does not throw |  |
| Close | button | tap it; it acts and does not throw |  |
| `rotCustom` | number | a valid number applies; letters and a negative are refused |  |
| `rotIndividually` | checkbox | toggle both ways; the drawing follows |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Colour  · `#style`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Use layer colour | button | tap it; it acts and does not throw |  |
| No fill | button | tap it; it acts and does not throw |  |
| Straight | button | tap it; it acts and does not throw |  |
| Curved | button | tap it; it acts and does not throw |  |
| Remove bends | button | tap it; it acts and does not throw |  |
| Free the ends | button | tap it; it acts and does not throw |  |
| Close | button | tap it; it acts and does not throw |  |
| `styTextSize` | number | a valid number applies; letters and a negative are refused |  |
| `endSize` | number | a valid number applies; letters and a negative are refused |  |
| `opObj` | range | works |  |
| `opFill` | range | works |  |
| `hatchSpace` | number | a valid number applies; letters and a negative are refused |  |
| `weightSlider` | range | works |  |
| `endTail` | select | every option selects and takes effect |  |
| `endHead` | select | every option selects and takes effect |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Save  · `#saveMenu`

| Control | Type | Test | ✓ |
|---|---|---|---|
| `miSaveFile` | button | tap it; it acts and does not throw |  |
| `miSaveSvg` | button | tap it; it acts and does not throw |  |
| `miSaveDxf` | button | tap it; it acts and does not throw |  |
| `miSavePng` | button | tap it; it acts and does not throw |  |
| `miPrint` | button | tap it; it acts and does not throw |  |
| `miSaveText` | button | tap it; it acts and does not throw |  |
| Save | button | tap it; it acts and does not throw |  |
| Save | button | tap it; it acts and does not throw |  |
| Copy template as text | button | tap it; it acts and does not throw |  |
| Close | button | tap it; it acts and does not throw |  |
| `slotName` | text | typing applies; empty is handled |  |
| `tplName` | text | typing applies; empty is handled |  |
| `gridInSvg` | checkbox | toggle both ways; the drawing follows |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Open  · `#openMenu`

| Control | Type | Test | ✓ |
|---|---|---|---|
| `miOpenFile` | button | tap it; it acts and does not throw |  |
| `miOpenText` | button | tap it; it acts and does not throw |  |
| `miImportSvg` | button | tap it; it acts and does not throw |  |
| `miImportZip` | button | tap it; it acts and does not throw |  |
| Export all to a file | button | tap it; it acts and does not throw |  |
| Restore from a file | button | tap it; it acts and does not throw |  |
| Close | button | tap it; it acts and does not throw |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Array  · `#arrayDlg`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Repeat | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `arrCols` | number | a valid number applies; letters and a negative are refused |  |
| `arrDx` | number | a valid number applies; letters and a negative are refused |  |
| `arrRows` | number | a valid number applies; letters and a negative are refused |  |
| `arrDy` | number | a valid number applies; letters and a negative are refused |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Offset  · `#offsetDlg`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Outward / left | button | tap it; it acts and does not throw |  |
| Inward / right | button | tap it; it acts and does not throw |  |
| Offset | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `offD` | number | a valid number applies; letters and a negative are refused |  |
| `offKeep` | checkbox | toggle both ways; the drawing follows |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Resize  · `#scaleDlg`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Resize | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `scFac` | number | a valid number applies; letters and a negative are refused |  |
| `scW` | number | a valid number applies; letters and a negative are refused |  |
| `scH` | number | a valid number applies; letters and a negative are refused |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Board outline  · `#boardDlg`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Draw it | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `bdW` | number | a valid number applies; letters and a negative are refused |  |
| `bdH` | number | a valid number applies; letters and a negative are refused |  |
| `bdR` | number | a valid number applies; letters and a negative are refused |  |
| `bdDia` | number | a valid number applies; letters and a negative are refused |  |
| `bdIn` | number | a valid number applies; letters and a negative are refused |  |
| `bdPat` | select | every option selects and takes effect |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### askval  · `#askval`

| Control | Type | Test | ✓ |
|---|---|---|---|
| OK | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `askvalInput` | text | typing applies; empty is handled |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### confirm  · `#confirm`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Replace | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### saveAs  · `#saveAs`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Continue | button | tap it; it acts and does not throw |  |
| Cancel | button | tap it; it acts and does not throw |  |
| `saveAsName` | text | typing applies; empty is handled |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Symbols  · `#symbols`

| Control | Type | Test | ✓ |
|---|---|---|---|
| ⇥ | button | tap it; it acts and does not throw |  |
| ✕ | button | tap it; it acts and does not throw |  |
| New set | button | tap it; it acts and does not throw |  |
| Edit library | button | tap it; it acts and does not throw |  |
| ⇤ | button | tap it; it acts and does not throw |  |
| Add | button | tap it; it acts and does not throw |  |
| Save library | button | tap it; it acts and does not throw |  |
| Load library | button | tap it; it acts and does not throw |  |
| Copy as text | button | tap it; it acts and does not throw |  |
| Paste from text | button | tap it; it acts and does not throw |  |
| Close | button | tap it; it acts and does not throw |  |
| `symName` | text | typing applies; empty is handled |  |
| `libSelect` | select | every option selects and takes effect |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### gridPop  · `#gridPop`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Lock X and Y | button | tap it; it acts and does not throw |  |
| More settings | button | tap it; it acts and does not throw |  |
| `gpX` | number | a valid number applies; letters and a negative are refused |  |
| `gpY` | number | a valid number applies; letters and a negative are refused |  |
| `gpMajor` | number | a valid number applies; letters and a negative are refused |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### viewPop  · `#viewPop`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Grid | button | tap it; it acts and does not throw |  |
| Sheet border | button | tap it; it acts and does not throw |  |
| Title block | button | tap it; it acts and does not throw |  |
| Object labels | button | tap it; it acts and does not throw |  |
| Dimensions | button | tap it; it acts and does not throw |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### Current layer  · `#layerPop`

| Control | Type | Test | ✓ |
|---|---|---|---|
| + New | button | tap it; it acts and does not throw |  |
| `layerPopNewName` | text | typing applies; empty is handled |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

### textIO  · `#textIO`

| Control | Type | Test | ✓ |
|---|---|---|---|
| Copy to clipboard | button | tap it; it acts and does not throw |  |
| Close | button | tap it; it acts and does not throw |  |
| `fileIn` | file | works |  |
| `libIn` | file | works |  |
| `setupIn` | file | works |  |
| `drawIn` | file | works |  |
| `svgIn` | file | works |  |
| `zipIn` | file | works |  |
| `layIn` | file | works |  |

Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which
stays open deliberately).

## File formats

- [ ] **Save to file** — reopens with everything intact
- [ ] **Export as SVG** — opens in a browser, hatch and labels present
- [ ] **Export as PNG** — correct size, nothing clipped
- [ ] **Export as DXF** — opens in QCAD or LibreCAD; layers and colours survive
- [ ] **Copy as text** — pastes back via Paste from text
- [ ] **Print at actual size** — at 100% a 100mm line measures 100mm on paper
- [ ] **Open a file** — a drawing, a template and a layer file each load
- [ ] **Import an SVG** — geometry arrives at the width you asked for
- [ ] **Import a ZIP of symbols** — becomes one set named after the file
- [ ] **Save/Load library** — round-trips a set
- [ ] **Export/Restore everything** — restores templates and sets on a fresh browser
- [ ] **Export/Import a layer** — carries its contents into another drawing

## Behaviours that have broken before

- [ ] **Hatch stays inside its shape** — the fault was the outline stroke redrawing it unclipped
- [ ] **Offset outward grows a closed shape** — the winding test was inverted
- [ ] **Symbols place centred, not offset** — the origin is the bounding-box minimum
- [ ] **Links follow their objects when dragged** — the whole point of a link
- [ ] **Deleting an object removes its links** — otherwise they dangle
- [ ] **A template applies without carrying geometry or a uid**
- [ ] **Restoring a setup survives a reload** — a migration used to eat it
- [ ] **Two tabs do not overwrite each other's sets**
- [ ] **The log survives a reload**
- [ ] **Settings layout is unbroken after any change** — a nested segrow broke it once

## Devices

| | iPad Safari | iPad Chrome | Desktop Chrome | Desktop Safari |
|---|---|---|---|---|
| Storage persists |  |  |  |  |
| Share Sheet save |  |  | n/a | n/a |
| System save dialog | n/a | n/a |  | n/a |
| Working folder | n/a | n/a |  | n/a |
| Drag a symbol to place |  |  |  |  |
| Toolbars float and dock |  |  |  |  |
| Print at 1:1 |  |  |  |  |
