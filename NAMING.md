# File names I will use, unchanged from here on

Written down because I changed a zip's name between releases and broke an upload.
A name that carries a version number is a different file every time, which is
exactly what a name should not be when you are overwriting something.

| name | what it is | changes name? |
|---|---|---|
| `update.zip` | only the files that changed since your last upload | **never** |
| `repo.zip` | the whole repository, for a fresh start or a rebuild | **never** |
| `index.html` | the app on its own | **never** |

The version is inside — the first line of `UPDATE.md`, and the app's own
Settings → About. It is never in a filename.

Individual files keep the names they have in the repo: `tests.js`, `CHANGELOG.md`,
`coverage.json`, and so on. If a file is in the repo, the copy I hand you has the
same name and belongs in the same place.

## What I will do each time

- name the files that changed, and only hand you those
- put them in `update.zip`, always that name
- say which of them are optional
- state the version and build hash in the message, not in a filename
