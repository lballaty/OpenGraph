# Drafting Grid — setting up, step by step

App version 3.1.1. Every button named below is the label as it appears on screen.

---

## Part 1 — Get it on a URL

**Why this comes first:** a page opened straight from a file gets no storage in
Safari. Symbol sets, templates, autosave, toolbar layout and the log all forget
themselves. Every step after this depends on it.

**1.1** On your repo, upload **`publish/index.html`** to the root, named
`index.html`.

**1.2** Repo → **Settings** → **Pages** → Source **Deploy from a branch**,
Branch **main**, folder **/ (root)** → **Save**.

**1.3** Wait a minute, then reload that page. The URL appears at the top:
`https://<you>.github.io/<repo>/`

**1.4** Open the URL on the iPad in Safari.

**1.5** Share menu → **Add to Home Screen**. Open it from there from now on —
an installed app gets treated more generously by the storage rules.

---

## Part 2 — Check it actually worked

**2.1** Tap **?** on the Edit bar.

**2.2** Look at the line at the bottom of the panel. It should read:

> Drafting Grid  3.1.1  ·  build 56df1b7c  ·  **storage ok**

The build hash is what identifies the copy — it changes with every edit, so it is
the reliable way to tell whether you are running the file you just uploaded.
Check it against `CHANGELOG.md`.

If it says **no storage**, hosting has not taken effect — you are still on the
file copy. Stop here; nothing below will persist.

**2.3** Tap that line. It opens **About**. Confirm **Storage** reads
`browser storage (localStorage)`.

**2.4** Tap **Ask to keep storage** in the same panel. Installed apps are
usually granted it, which exempts you from Safari clearing everything after
seven days of not using it.

---

## Part 3 — Load the templates and symbols

One file carries all nine templates and all nine symbol sets — 159 symbols.

**3.1** Download **`drafting-grid-setup.json`** to the iPad.

**3.2** In the app: **Settings** button on the Edit bar → scroll to the
**Workspace** section → **Restore from a file**.

**3.3** Pick `drafting-grid-setup.json`. It reports what it restored.

**3.4** Check it arrived: tap **Open** on the Edit bar. Under **New from
template** you should see nine entries.

**3.5** Check the symbols: tap **Symbols** on the Draw bar. The set selector at
the top should list Architectural, Block, DSP board, Flowchart, Ladder, Maker
boards, Maker schematic, Network, Schematic.

> Do this instead of importing files one at a time. It cannot end up with a
> template loaded but its symbols missing.

---

## Part 4 — Add an icon pack

Optional. Skip to Part 5 if you do not want extra icons. Do **not** import
`maker-pack.zip` — it is already in the setup file you just restored.

**4.1** In Safari, download **`network-extras.zip`**. Tap the download arrow at
the top right, then tap the file in the list. Safari asks where to put it —
choose **On My iPad → Downloads** and tap **Save**.

**4.2** Go back to the app. Tap the **Open** button on the Edit bar.

**4.3** Tap **Import a ZIP of symbols**. The file picker opens.

**4.4** Tap **Browse** at the bottom, then **On My iPad → Downloads**, then
`network-extras.zip`.

**4.5** A box appears asking **Symbol size**, with a number already in it.
Clear it and type **30**. Tap **OK**.

> This is the width every icon in the pack will be. There is no way to resize a
> whole set afterwards, so it is worth getting roughly right. Use **30** for
> network and flowchart packs, **20** for electronics, **900** for the
> house-garden pack, whose icons are furniture on a plan drawn at real size.

**4.6** A message says how many symbols were imported, and the Symbols panel
opens on the new set.

**4.7** Check it: the set selector at the top of the Symbols panel should now
read **network extras**, with about twenty symbols listed below.

**4.8** Repeat 4.1–4.6 for any other pack you want.

---

## Part 5 — Set the units and grid

**5.1** Tap the **Settings** button on the Edit bar.

**5.2** The first section is **Units & grid**. Tap the unit you think in —
**mm** for buildings, gardens and boards.

**5.3** The **Grid** field below it sets the spacing in that unit. Leave it as it
is for now; each template brings its own.

> You are setting the default for drawings you start from scratch. Opening a
> template overrides all of this with the template's own settings, which is the
> point of them.

---

## Part 6 — Set up snapping

Still in **Settings**, scroll to the **Snapping** section.

**6.1** Make sure **Grid intersections** is ticked. This is what makes things
line up.

**6.2** Tick **Line intersections**. It is off by default and it is the one that
makes corners land exactly where two walls cross. Worth having on for plan work.

**6.3** Leave **Midpoints** and **Circle centres** ticked, **Perpendicular** and
**Nearest point on object** unticked. Turn those two on later if you find you
need them.

**6.4** Leave **Nudge distance** empty. Empty means an arrow key moves the
selection by one grid step, which is usually what you want.

---

## Part 7 — Check autosave is on

**7.1** Still in **Settings**, scroll to the **Autosave** section.

**7.2** Confirm the switch is on.

> It keeps one rolling copy in the browser while you work, and offers it back if
> the app closes unexpectedly. It is not a substitute for saving to a file — it
> only ever holds the most recent drawing.

---

## Part 8 — Arrange the toolbars

Do this after you have drawn for an hour, not now. Noted here so you know it
exists.

**8.1** Press and drag the **dotted handle** at the left end of the Draw bar.
The bar lifts off the edge and follows your finger.

**8.2** Drop it down the left side of the screen.

**8.3** Two small buttons appear in its header. Tap **⇕** to stand it up as a
column.

**8.4** Tap **▤** to shrink it to icons only, if you want it narrower.

**8.5** To put it back, tap **⤢** in its header.

> A column down the side is usually easier to reach on a tablet than a row across
> the top.

**8.6** To hide buttons you never use: tap **?** on the Edit bar, then **☰** in
the panel header for the full guide. Each row there has a dot; tap it to hide
that button.

---

## Part 9 — Make your first drawing from a template

**9.1** Tap the **Open** button on the Edit bar.

**9.2** Scroll to **New from template**. Nine templates are listed.

**9.3** Tap **New** beside **Network**.

**9.4** The sheet clears and you get an A3 border with a title block. The Symbols
panel now has the Network set available.

**9.5** Tap **Symbols** on the Draw bar, tap **Place** beside **Router**, then
tap the sheet. A router appears.

**9.6** Place a **Switch** somewhere below it the same way.

**9.7** Tap **Link** on the Draw bar. Tap the router, then the switch. A line
joins them.

**9.8** Tap **Select** on the Draw bar, then drag the router. **The line should
follow it.** That is the test that everything is working.

---

## Part 10 — Save your own template

Once you have a drawing set up the way you like — right units, right layers.

**10.1** Tap the **Save** button on the Edit bar.

**10.2** Find the **Save as template** box near the bottom.

**10.3** Type a name, for example `My plan`.

**10.4** Tap **Save** beside it.

**10.5** Check it: tap **Open**. Your name now appears under **New from
template** alongside the nine.

---

## Part 11 — Back everything up

**Do this now.** Browser storage can be cleared without warning, and this file is
the only way back.

**11.1** Tap **Settings** → scroll to the **Workspace** section.

**11.2** Tap **Export everything**.

**11.3** Safari asks what to do with the file. Choose **Save to Files**, then a
folder you will find again — iCloud Drive is sensible.

**11.4** Do this again after any session where you add symbols or templates. The
**About** section shows **Changed since you exported** when it is worth
repeating.

> To restore on a new device or after a clear-out: **Settings** → **Workspace**
> → **Restore from a file**, and hand it that file.

---

## Part 12 — Confirm the whole thing works

**12.1** Download **`samples/network-drawing.json`** the same way as in 4.1.

**12.2** Tap **Open** → **Open a file** → pick it from Downloads.

**12.3** You should see a network diagram: routers, switches, servers, all
labelled, joined by lines, inside a dashed DMZ boundary.

**12.4** Tap **Select** on the Draw bar, then drag any node a few centimetres.

**12.5** **The lines joining it should follow.** If they do, symbols, links,
labels and layers are all working.

**12.6** Tap **Save** → **Export as DXF**. If a file downloads, export works.

**12.7** Tap **Undo** twice to put the node back.

---

## If something goes wrong

**Settings** → **About** → **View log**. Every import, rejection and dropped
object is recorded with the reason, and it survives a reload.

**?** on the Edit bar → type what you are trying to do in plain words. Tap
**This one** on whichever answer was right, and it will come up first next time.

---

## Quick reference

| Task | Where |
|---|---|
| Templates and symbol sets | Settings → Workspace → Restore from a file |
| A ZIP of SVGs | Open → Import a ZIP of symbols |
| One symbol set | Symbols → Load library |
| A drawing or template file | Open → Open a file |
| One layer from another drawing | Settings → Layers → Import a layer |
| Back everything up | Settings → Workspace → Export everything |
