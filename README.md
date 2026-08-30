# OpenGraph — Drafting Grid

A single-file browser CAD and graph-paper app. No build step, no dependencies:
`index.html` is the whole thing.

**Live:** https://lballaty.github.io/OpenGraph/

## Repository layout

| Path | What |
|---|---|
| `index.html` | The app. This is what GitHub Pages serves. |
| `checks.js` | Structural checks. `node checks.js index.html` |
| `CHANGELOG.md` | Every release, with the build hash that shipped |
| `drafting-grid.schema.json` | JSON Schema for the file formats |
| `drafting-grid-format.md` | The format, field by field |
| `drafting-grid-agent.md` | Generating drawings programmatically |
| `SETUP.md` | Setting the app up, step by step |
| `RELEASING.md` | How a release is made and why |
| `drafting-grid-setup.json` | All templates and symbol sets, one import |
| `starter/` | Nine templates with their symbol sets |
| `samples/` | Nine worked drawings |
| `packs/` | Icon packs as importable ZIPs |
| `.github/workflows/checks.yml` | Runs the checks on every push |

## Changing the app

1. Edit `index.html`
2. Add a `## <version>` section to `CHANGELOG.md`
3. Bump `APP_VERSION`, and set `APP_HASH` to the first eight characters of the
   file's SHA-256 computed with `APP_HASH="__HASH__"` in place
4. `node checks.js index.html`
5. Push. The workflow re-runs the checks.

Step 3 is fiddly by hand — `release.sh` does 3 and 4 together if you are working
on a machine with a shell.

## The two numbers

**Version** is a judgement: how much changed, and whether it breaks anything.

**Build hash** is a fact: the first eight characters of the file's own SHA-256.
It changes with every edit and cannot be forgotten, which is what makes it the
reliable way to tell whether the copy running on a device is the one you just
pushed. Both appear at the foot of the **?** panel and in Settings → About.
