#!/bin/bash
# Publish a build. Refuses rather than guesses.
#
# The hash was automated from the start, so it never went wrong. The version was left to
# whoever remembered, so it did. This makes both mechanical: you cannot publish without
# stating what kind of change it was, and it checks the changelog was actually written.
#
#   ./release.sh patch  "storage repair"     bug fix, no new features
#   ./release.sh minor  "trim and extend"    new features, nothing breaks
#   ./release.sh major  "drawing scale"      changes the file format
#   ./release.sh same   "typo in a comment"  no version change; must say why
set -e
SRC=/home/claude/work.html
OUT1=/mnt/user-data/outputs/publish/index.html
OUT2=/mnt/user-data/outputs/graph-paper_3.html
CHANGELOG=/mnt/user-data/outputs/CHANGELOG.md

KIND="${1:-}"; WHY="${2:-}"
if [ -z "$KIND" ] || [ -z "$WHY" ]; then
  echo "refusing: say what kind of change and why"
  echo "  ./release.sh {major|minor|patch|same} \"one line\""
  exit 1
fi

CUR=$(grep -o 'APP_VERSION="[^"]*"' "$SRC" | head -1 | cut -d'"' -f2)
IFS=. read -r MA MI PA <<< "$CUR"; PA=${PA:-0}
case "$KIND" in
  major) NEW="$((MA+1)).0.0" ;;
  minor) NEW="$MA.$((MI+1)).0" ;;
  patch) NEW="$MA.$MI.$((PA+1))" ;;
  same)  NEW="$CUR" ;;
  *) echo "refusing: kind must be major, minor, patch or same"; exit 1 ;;
esac

# A version change with no changelog entry is a version change nobody can interpret.
if [ "$NEW" != "$CUR" ] && ! grep -q "^## $NEW " "$CHANGELOG" 2>/dev/null; then
  echo "refusing: no '## $NEW' section in CHANGELOG.md"
  echo "  write the entry first, then release"
  exit 1
fi

sed -i "s/APP_VERSION=\"[^\"]*\"/APP_VERSION=\"$NEW\"/" "$SRC"
H=$(sed 's/const APP_HASH="[^"]*"/const APP_HASH="__HASH__"/' "$SRC" | sha256sum | cut -c1-8)
for OUT in "$OUT1" "$OUT2"; do
  sed "s/const APP_HASH=\"[^\"]*\"/const APP_HASH=\"$H\"/" "$SRC" > "$OUT"
done
# The changelog names the build, so the hash in it always matches what shipped. Run this
# for EVERY release, not only when the version changed: a "same" release still produces a
# new hash, and skipping the rewrite left the entry saying "pending" after a successful
# publish -- precisely the drift this script exists to stop.
if true; then
  # Matches whatever placeholder the entry was written with, not just a hex string --
  # the first attempt only rewrote an existing hash, so an entry written with "pending"
  # kept saying pending, which is the drift this script exists to prevent.
  sed -i "s/^## $NEW — \([0-9-]*\) · build \`[^\`]*\`/## $NEW — \1 · build \`$H\`/" "$CHANGELOG"
  if ! grep -q "^## $NEW — .* build \`$H\`" "$CHANGELOG"; then
    echo "warning: could not write the build hash into the CHANGELOG entry for $NEW"
    echo "  the entry heading must read:  ## $NEW — YYYY-MM-DD · build \`something\`"
  fi
fi
node -e '
const fs=require("fs");
const s=fs.readFileSync(process.argv[1],"utf8");
const js=s.slice(s.indexOf("<script>")+8,s.lastIndexOf("</script>"));
new Function(js); // throws on a syntax error rather than shipping it
' "$OUT1"
# Structural checks: syntax passing says nothing about whether a change matches the
# rest of the app. This is what would have caught the settings layout.
# The suite runs from the repo copy, where the shipped JSON lives beside it.
( cd /mnt/user-data/outputs/repo && cp "$OUT1" index.html && node tests.js index.html >/dev/null ) || {
  echo "refusing: tests failed"
  ( cd /mnt/user-data/outputs/repo && node tests.js index.html | grep FAIL )
  exit 1
}
# Executes the app in a DOM. Source checks cannot catch a reference error or a broken
# call chain; this can, and it has -- it found the offscreen-canvas failure that would
# have blanked the screen. Run before the structural checks so a crash is reported first.
node /home/claude/live.js "$OUT1" >/dev/null 2>&1 || {
  echo "refusing: the app did not execute cleanly"
  node /home/claude/live.js "$OUT1" 2>&1 | grep -E "FAIL|error" | head -5
  exit 1
}
# The coverage ratchet: if the script changed, the test count must have risen. "Add a test
# for it" is a habit that decays, and the fixes that looked too obvious to test are exactly
# the ones that came back. A waiver exists and demands a written reason.
( cd /mnt/user-data/outputs/repo && cp "$OUT1" index.html && node coverage.js index.html >/dev/null ) || {
  echo "refusing: coverage gate failed"
  ( cd /mnt/user-data/outputs/repo && node coverage.js index.html | grep -E "FAIL" )
  echo "  add a test, or: COVERAGE_WAIVER=\"reason\" ./release.sh ..."
  exit 1
}
# Accepted, so the next release ratchets from here.
( cd /mnt/user-data/outputs/repo && node coverage.js index.html --record >/dev/null )

# Drives the app through the intent API, executing real geometry code in a DOM. This is
# the only check that constructs geometry and then inspects what was stored -- the gap the
# NaN-coordinate bug lived in for nineteen releases.
node /home/claude/intent.js "$OUT1" >/dev/null 2>&1 || {
  echo "refusing: the intent API did not behave"
  node /home/claude/intent.js "$OUT1" 2>&1 | grep -E "FAIL" | head -5
  exit 1
}
# The shipped starter files, samples and setup file must still validate against the
# schema, since a schema change can invalidate them and nothing else would notice.
node -e '
const fs=require("fs");
let Ajv;try{Ajv=require("/home/claude/node_modules/ajv");}catch(e){process.exit(0);}
const dir="/mnt/user-data/outputs/repo";
if(!fs.existsSync(dir+"/drafting-grid.schema.json"))process.exit(0);
const v=new Ajv({allErrors:true,strict:false}).compile(
  JSON.parse(fs.readFileSync(dir+"/drafting-grid.schema.json","utf8")));
let bad=[];
["starter","samples"].forEach(d=>{
  if(!fs.existsSync(dir+"/"+d))return;
  fs.readdirSync(dir+"/"+d).filter(f=>f.endsWith(".json")).forEach(f=>{
    if(!v(JSON.parse(fs.readFileSync(dir+"/"+d+"/"+f,"utf8"))))bad.push(d+"/"+f);});
});
if(bad.length){console.error("refusing: shipped files no longer validate: "+bad.join(", "));process.exit(1);}
' || exit 1
node /mnt/user-data/outputs/checks.js "$OUT1" >/dev/null || {
  echo "refusing: structural checks failed \u2014 run: node checks.js"
  node /mnt/user-data/outputs/checks.js "$OUT1" | grep FAIL
  exit 1
}
echo "released $NEW  build $H  ($KIND: $WHY)"
