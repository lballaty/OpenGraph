# OpenGraph — Drafting Grid

A single-file browser CAD and graph-paper app. No build step, no dependencies:
`index.html` is the whole thing.

**Live:** https://lballaty.github.io/OpenGraph/

## What matters if you only read one thing

Only `index.html` is needed for the app to run. Everything else is verification,
documentation, or content you can already load from inside the app.

## The app

| Path | What |
|---|---|
| `index.html` | The app. This is what GitHub Pages serves. |

## Verification — run before pushing, and run again by CI

| Path | What it does | Needs |
|---|---|---|
| `tests.js` | ~460 tests over geometry, validation, permissions, formatting | nothing |
| `checks.js` | structural consistency: dead controls, markup patterns, duplicate shortcuts, reserved storage keys, version/changelog agreement | nothing |
| `testplan.js` | regenerates `TEST-PLAN.md` from the source | nothing |
| `live.js` | **executes** the app in a DOM and clicks every control | jsdom, canvas |
| `intent.js` | drives the app through its scripting API and inspects what it stored | jsdom, canvas |
| `.github/workflows/checks.yml` | runs all of the above on every push | — |

```
node tests.js index.html
node checks.js index.html
node testplan.js index.html > TEST-PLAN.md
npm install --no-save jsdom canvas
node live.js index.html
node intent.js index.html
```

The last two are the only checks that *run* the app rather than read it. They have
each caught a fault no source check could see — a blank-screen failure under memory
pressure, and an initialisation-order error that stopped the whole script.

`release.sh` drives all of this plus version stamping, but its paths are specific to
the machine it was written on. `RELEASING.md` describes the manual equivalent.

## Documentation

| Path | What |
|---|---|
| `CHANGELOG.md` | every release, with the build hash that shipped |
| `TODO.md` | known bugs, measured findings, and decisions taken with their reasons |
| `TEST-PLAN.md` | 177 rows needing a real device — layout, gestures, printing |
| `SETUP.md` | setting the app up, step by step |
| `RELEASING.md` | how a release is made and why |

## Format reference

| Path | What |
|---|---|
| `drafting-grid.schema.json` | JSON Schema for every file type |
| `drafting-grid-format.md` | the format, field by field |
| `drafting-grid-agent.md` | generating drawings programmatically |

## Content

| Path | What |
|---|---|
| `drafting-grid-setup.json` | all templates and symbol sets, one import |
| `starter/` | nine templates with their symbol sets |
| `samples/` | nine worked drawings |
| `packs/` | icon packs as importable ZIPs |

## Scripting the app

The app exposes a small API, which is also what `intent.js` drives:

```js
draftingGrid.intent({op:"circle", at:{x:0,y:0}, r:250, fill:"#c9a227", fop:0.3})
draftingGrid.intents([ /* ... */ ])   // all-or-nothing
draftingGrid.intent({op:"inspect"})   // read-only
draftingGrid.ops()                    // what it accepts
```

`{op:"command", name:"..."}` reaches all 51 toolbar commands.

## Changing the app

1. Edit `index.html`
2. Add a `## <version>` section to `CHANGELOG.md`
3. Bump `APP_VERSION`; set `APP_HASH` to the first eight characters of the file's
   SHA-256, computed with `APP_HASH="__HASH__"` in place
4. Run the verification above
5. Push. The workflow re-runs it.

**Version** is a judgement: how much changed, and whether it breaks anything.
**Build hash** is a fact — it changes with every edit and cannot be forgotten, which
makes it the reliable way to tell whether the copy on a device is the one you
pushed. Both appear at the foot of the **?** panel and in Settings → About.
