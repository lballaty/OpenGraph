#!/usr/bin/env node
/* Generates TEST-PLAN.md from index.html.
 *
 * Generated rather than written, because a hand-kept list of controls goes stale the
 * first time someone adds a button and forgets the document. This reads the source, so
 * the plan cannot claim coverage of something that no longer exists, nor miss something
 * that was added yesterday.
 *
 *   node testplan.js index.html > TEST-PLAN.md
 */
const fs=require("fs");
const src=fs.readFileSync(process.argv[2]||"index.html","utf8");
const html=src.slice(0,src.indexOf("<script>"));
const js=src.slice(src.indexOf("<script>"));
const ver=/APP_VERSION="([^"]+)"/.exec(src)[1];
const hash=/APP_HASH="([^"]+)"/.exec(src)[1];

/* Matched on the id and bar alone. Requiring a shortcut too silently dropped Merge,
   which has none -- and a test plan that quietly omits a command is worse than no plan,
   because it looks complete. The count is asserted below for the same reason. */
const cmds=[...src.matchAll(/\{id:"([a-z0-9]+)",\s*bar:([12]),\s*lbl:"([^"]+)"(?:,\s*def:"([^"]*)")?/g)]
  .map(m=>({id:m[1],bar:m[2],lbl:m[3],key:m[4]||""}));
const declared=[...src.matchAll(/\{id:"([a-z0-9]+)",\s*bar:[12],/g)].length;
if(cmds.length!==declared){
  console.error("testplan: matched "+cmds.length+" commands but "+declared+" are declared \u2014 "+
    "the plan would be incomplete");
  process.exit(1);
}
const whatis=Object.fromEntries([...src.matchAll(/\{c:"([a-z0-9]+)",d:"([^"]+)"/g)].map(m=>[m[1],m[2]]));

// Every dialog and panel, with the controls inside it.
const panels=[];
const re=/<div id="([a-zA-Z]+)"[^>]*(?:role="dialog"|class="sec")[^>]*>/g;
let m,marks=[];
while((m=re.exec(html)))marks.push({id:m[1],at:m.index});
marks.forEach((mk,i)=>{
  const body=html.slice(mk.at,i+1<marks.length?marks[i+1].at:html.length);
  const h=/<h3>([^<]+)<\/h3>/.exec(body);
  const controls=[
    ...[...body.matchAll(/<button[^>]*id="([^"]+)"[^>]*>([^<]*)</g)].map(x=>({t:"button",id:x[1],lbl:x[2].trim()})),
    ...[...body.matchAll(/<input[^>]*id="([^"]+)"[^>]*type="([a-z]+)"/g)].map(x=>({t:x[2],id:x[1]})),
    ...[...body.matchAll(/<input[^>]*type="([a-z]+)"[^>]*id="([^"]+)"/g)].map(x=>({t:x[1],id:x[2]})),
    ...[...body.matchAll(/<select[^>]*id="([^"]+)"/g)].map(x=>({t:"select",id:x[1]}))
  ];
  const seen=new Set();
  panels.push({id:mk.id,title:h?h[1].replace(/&amp;/g,"&"):mk.id,
    controls:controls.filter(c=>!seen.has(c.id)&&seen.add(c.id))});
});

const out=[];
const P=x=>out.push(x);
P("# Test plan");
P("");
P("Generated from `index.html` \u2014 version **"+ver+"**, build **`"+hash+"`**.");
P("Regenerate with `node testplan.js index.html > TEST-PLAN.md` after any change.");
P("");
P("Automated coverage is in `tests.js` (`node tests.js`). Everything below needs a real");
P("device: the logic can be tested headlessly, but layout, gestures, pickers and storage");
P("cannot.");
P("");
P("## How to use it");
P("");
P("Work down the list on the device. Anything that fails, note the build hash from the");
P("foot of the **?** panel and the relevant lines from **About \u2192 Copy details & log**.");
P("");

P("## Commands \u2014 "+cmds.length+" total");
P("");
P("Each should: respond to its button, respond to its shortcut, and appear in the help");
P("search under its own name.");
P("");
P("| Command | Bar | Key | Does | \u2713 |");
P("|---|---|---|---|---|");
cmds.forEach(c=>P("| "+c.lbl+" | "+c.bar+" | "+(c.key?"`"+c.key+"`":"none")+" | "+(whatis[c.id]||"\u2014")+" |  |"));
P("");

P("## Panels and dialogs");
P("");
const skip=new Set(["app","stage","acts","status","prog","bars","polyBar"]);
panels.filter(p=>p.controls.length&&!skip.has(p.id)).forEach(p=>{
  P("### "+p.title+"  \u00b7 `#"+p.id+"`");
  P("");
  P("| Control | Type | Test | \u2713 |");
  P("|---|---|---|---|");
  p.controls.forEach(c=>{
    const test=c.t==="button"?"tap it; it acts and does not throw"
      :c.t==="checkbox"?"toggle both ways; the drawing follows"
      :c.t==="number"?"a valid number applies; letters and a negative are refused"
      :c.t==="text"?"typing applies; empty is handled"
      :c.t==="select"?"every option selects and takes effect":"works";
    P("| "+(c.lbl||"`"+c.id+"`")+" | "+c.t+" | "+test+" |  |");
  });
  P("");
  P("Also: **Escape** closes it, and a tap outside closes it (except the Ask panel, which");
  P("stays open deliberately).");
  P("");
});

P("## File formats");
P("");
[["Save to file","reopens with everything intact"],
 ["Export as SVG","opens in a browser, hatch and labels present"],
 ["Export as PNG","correct size, nothing clipped"],
 ["Export as DXF","opens in QCAD or LibreCAD; layers and colours survive"],
 ["Copy as text","pastes back via Paste from text"],
 ["Print at actual size","at 100% a 100mm line measures 100mm on paper"],
 ["Open a file","a drawing, a template and a layer file each load"],
 ["Import an SVG","geometry arrives at the width you asked for"],
 ["Import a ZIP of symbols","becomes one set named after the file"],
 ["Save/Load library","round-trips a set"],
 ["Export/Restore everything","restores templates and sets on a fresh browser"],
 ["Export/Import a layer","carries its contents into another drawing"]]
 .forEach(([a,b])=>P("- [ ] **"+a+"** \u2014 "+b));
P("");

P("## Behaviours that have broken before");
P("");
[["Hatch stays inside its shape","the fault was the outline stroke redrawing it unclipped"],
 ["Offset outward grows a closed shape","the winding test was inverted"],
 ["Symbols place centred, not offset","the origin is the bounding-box minimum"],
 ["Links follow their objects when dragged","the whole point of a link"],
 ["Deleting an object removes its links","otherwise they dangle"],
 ["A template applies without carrying geometry or a uid",""],
 ["Restoring a setup survives a reload","a migration used to eat it"],
 ["Two tabs do not overwrite each other's sets",""],
 ["The log survives a reload",""],
 ["Settings layout is unbroken after any change","a nested segrow broke it once"]]
 .forEach(([a,b])=>P("- [ ] **"+a+"**"+(b?" \u2014 "+b:"")));
P("");

P("## Devices");
P("");
P("| | iPad Safari | iPad Chrome | Desktop Chrome | Desktop Safari |");
P("|---|---|---|---|---|");
[["Storage persists","","","",""],["Share Sheet save","","","n/a","n/a"],
 ["System save dialog","n/a","n/a","","n/a"],["Working folder","n/a","n/a","","n/a"],
 ["Drag a symbol to place","","","",""],["Toolbars float and dock","","","",""],
 ["Print at 1:1","","","",""]].forEach(r=>P("| "+r.join(" | ")+" |"));
console.log(out.join("\n"));
