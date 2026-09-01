# Releasing

## Why this file exists

Version 3.1 shipped a day's worth of changes — DXF export, resize, offset,
trim, ZIP import, validation, the whole help system — all under one unchanged
number, and 3.1.1 (a fix for silent data loss) nearly went out the same way.

The cause was an asymmetry, not forgetfulness. The build hash was computed by a
script, so it never went wrong. The version was left to whoever remembered, so it
did. **Anything left manual in a repeated process gets skipped eventually.**

So the release is now a script that refuses rather than guesses.

## Publishing

```
./release.sh {major|minor|patch|same} "one line saying why"
```

| Kind | When |
|---|---|
| `major` | The file format changed — old files may not open |
| `minor` | New features, existing files unaffected |
| `patch` | A fix, no new features |
| `same` | Genuinely no behaviour change; you must still say why |

It refuses if you give no kind, no reason, or bump a version with no matching
`## <version>` section in `CHANGELOG.md`. It then stamps the version, computes
the hash from the file's own contents, writes the hash into the changelog entry
so the two always agree, and syntax-checks what it is about to publish.

## The two numbers

**Version** is a judgement — how much changed, and whether it breaks anything.
A person has to decide it, which is why the script asks rather than infers.

**Build hash** is a fact — the first eight characters of the file's own SHA-256.
It changes with every edit and cannot be forgotten. It is what tells you whether
the copy running on the iPad is the one you just uploaded, and version numbers
cannot do that because several builds ship under the same one.

Both appear at the foot of the **?** panel, in **Settings → About**, and in the
first line of the log.

## What is deliberately not versioned in step

`drafting-grid.schema.json`, `drafting-grid-format.md` and
`drafting-grid-agent.md` describe the **file format**, not the app. They move
only when the format does. Bumping them alongside every app build would imply
existing drawings need attention when they do not.

## Before releasing

1. `node --check` on the extracted script — the release script does this
2. Every shipped `.json` still validates against the schema
3. No missing element ids, duplicate shortcuts, or commands without an icon
4. `CHANGELOG.md` entry written **first**, since the script checks for it
