# Setting up Drafting Grid

## 1. Put the app on your repo

Upload **one file**:

| File | Where |
|---|---|
| `publish/index.html` | repository root, as `index.html` |

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Your URL appears there a minute later. Open it on the iPad and
**Add to Home Screen** from the share menu.

Check it worked: **Settings → About** should say `browser storage (localStorage)`,
not `this session only`. That one line is the whole test. Then tap
**Ask to keep storage** in the same panel.

Nothing else has to go in the repo. Everything below is optional and
loaded from inside the app.

## 2. Load everything in one action

| File | How |
|---|---|
| **`drafting-grid-setup.json`** | Settings → Workspace → **Restore from a file** |

That single file carries **all 9 templates and all 9 symbol sets** — 159 symbols.
Do this instead of importing them one at a time, and you cannot end up with a
template loaded but its symbols missing.

Afterwards, tap **Open** and the templates are listed under *New from template*.

## 3. Extra symbol packs — optional

Icon packs, imported with **Open → Import a ZIP of symbols**. Each becomes its
own set. You are asked for one width for the whole pack: 20–40 mm for diagram
work, 600–2000 mm for furniture on a plan.

| File | Icons |
|---|---|
| `packs/network-extras.zip` | 20 — routers, servers, cloud, database |
| `packs/house-garden-extras.zip` | 28 — doors, furniture, bathroom, trees |
| `packs/electronics-extras.zip` | 18 — chips, LEDs, boards, connectors |
| `packs/flowchart-extras.zip` | 18 — people, documents, alerts, money |

These are Material Design Icons, Apache-2.0. They are **icons, not engineering
symbols** — right for a network diagram, wrong for a schematic.

`packs/maker-pack.zip` is already inside `drafting-grid-setup.json`, so skip it
unless you want the maker sets on their own.

## 4. Sample drawings — optional

Open with **Open → Open a file**. Useful for seeing how each template is meant
to be used.

`samples/house-garden-drawing.json` · `ladder-drawing.json` ·
`flowchart-drawing.json` · `block-diagram-drawing.json` · `network-drawing.json` ·
`schematic-drawing.json` · `dsp-board-drawing.json` ·
`maker-schematic-drawing.json` · `maker-layout-drawing.json`

## 5. Reference — for you, not the app

| File | What |
|---|---|
| `drafting-grid.schema.json` | JSON Schema for the drawing format |
| `drafting-grid-format.md` | The format explained |
| `drafting-grid-agent.md` | Notes for generating drawings programmatically |
| `packs/README.md` | Pack licensing and sizing |
| `publish/README.md` | Hosting notes |

Worth keeping in the repo alongside the app so the format is documented where
the code is.

## Order

1. Upload `index.html`, enable Pages, open the URL
2. Add to Home Screen, check About says `localStorage`
3. Restore `drafting-grid-setup.json`
4. Import any packs you want
5. Open a sample to check it all arrived

## One habit worth keeping

**Settings → Workspace → Export everything**, occasionally. Browser storage can
be cleared without warning, and that file is the only way back. Keep it beside
your drawings.
