# Putting Drafting Grid on a URL

`index.html` is the whole app. Upload it, open the URL, done.

Why it matters: a page opened straight from a file gets **no storage at all** in Safari,
which is why symbol sets, templates, autosave, toolbar layout and the log have all been
forgetting themselves. Any `http://` or `https://` address fixes that — it does not have
to be a fancy host.

## GitHub Pages — free, permanent, works from the iPad

1. github.com → **New repository** → name it, e.g. `drafting-grid`, tick **Public**
2. **uploading an existing file** → choose `index.html` → **Commit changes**
3. **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, folder: **/ (root)** → Save
4. Wait a minute. The URL appears on that page:
   `https://<your-username>.github.io/drafting-grid/`

To update later, upload a new `index.html` over the old one.

## Netlify Drop — fastest, no repository

netlify.com/drop, drag the folder in, instant URL. Free account to keep it.

## A computer on the same network — for testing only

In the folder containing `index.html`:

    python3 -m http.server 8000

Then open `http://<that-computer's-IP>:8000` on the iPad.

Storage works, but **the IP is part of the address**. If it changes, the browser treats it
as a different site and none of your stored setup follows. Fine for an hour's testing,
not for keeping anything.

## Once it is on a URL

- **Add to Home Screen** from the share menu. It opens without browser chrome, and an
  installed app is treated more generously by the storage rules.
- **Settings → About** should then say `browser storage (localStorage)` rather than
  `this session only`. That one line tells you whether it worked.
- Tap **Ask to keep storage** in the same panel. Installed apps are usually granted it,
  which exempts you from the seven-day inactivity clearance.

## Your existing setup will not follow

Storage is per origin. The hosted copy starts empty, with none of the symbol sets or
templates from your local copy.

Before you switch: in the local copy, **Settings → Workspace → Export everything**. Then
in the hosted copy, take the restore offer on launch and hand it that file. Drawings are
ordinary files and open in either.

## Keep the local copy

It still works with no network at all — it just cannot remember anything between
sessions. Useful on a train; not where you are building a symbol library.
