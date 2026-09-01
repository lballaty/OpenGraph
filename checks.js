#!/usr/bin/env node
/* Structural checks run before every release.
 *
 * Written after a log-level control was added to Settings using markup the panel does not
 * use anywhere else -- a segrow nested inside a row beside a fixed-width label -- which
 * broke the layout. Syntax checks cannot see that: the file parsed, the ids all existed,
 * every function worked. What was wrong was that it did not match its surroundings.
 *
 * So these check consistency with what is already there, not correctness in the abstract.
 */
const fs=require("fs");
const target=process.argv[2]||"index.html";
if(!fs.existsSync(target)){
  console.error("usage: node checks.js [path-to-index.html]   (default: ./index.html)");
  process.exit(2);
}
const src=fs.readFileSync(target,"utf8");
console.log("checking "+target+"\n");
const html=src.slice(0,src.indexOf("<script>"));
const js=src.slice(src.indexOf("<script>"));
let fails=0;
const check=(name,ok,detail)=>{
  if(!ok){fails++;console.log("  FAIL  "+name+(detail?"  \u2014 "+detail:""));}
  else console.log("  ok    "+name);
};

// --- markup consistency -----------------------------------------------------
const rows=[...html.matchAll(/<div class="row"[^>]*>([\s\S]*?)<\/div>/g)].map(m=>m[1]);
check("every labelled row has a field beside the label",
  !rows.some(r=>/<label/.test(r)&&!/<(input|select|textarea|span)/.test(r)),
  "a label with no control stretches oddly");
/* The first version of this check spanned the row's closing tag, so a segrow that
   merely FOLLOWED a row was reported as nested inside it. Match only within a row that
   has not yet closed. */
check("no segrow nested inside a row",
  !rows.some(r=>/<div class="segrow"/.test(r)),
  "the panel puts segrows at section level, under a note");
const segrows=[...html.matchAll(/<div class="segrow"([^>]*)>/g)].map(m=>m[1]);
check("segrows use only the established styles",
  !segrows.some(a=>/flex:1/.test(a)),
  "flex:1 is not used by any original segrow");

// --- ids and wiring ---------------------------------------------------------
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const used=new Set([...js.matchAll(/\$\("([^"]+)"\)/g)].map(m=>m[1]));
const missing=[...used].filter(i=>!ids.has(i));
check("every element the script reaches for exists",!missing.length,missing.join(", "));
const dupIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
check("no duplicate element ids",new Set(dupIds).size===dupIds.length);

// --- commands ---------------------------------------------------------------
const cmds=[...src.matchAll(/\{id:"([a-z0-9]+)",\s*bar:([12]),/g)].map(m=>[m[1],m[2]]);
const icons=JSON.parse(/const ICONS=(\{[\s\S]*?\});/.exec(src)[1]);
const hues=JSON.parse(/const ICON_HUES=(\{[\s\S]*?\});/.exec(src)[1]);
check("every command has an icon",!cmds.some(([c])=>!icons[c]),
  cmds.filter(([c])=>!icons[c]).map(c=>c[0]).join(", "));
check("every command has a colour",!cmds.some(([c])=>!hues[c]),
  cmds.filter(([c])=>!hues[c]).map(c=>c[0]).join(", "));
const defs=[...src.matchAll(/def:"([^"]+)"/g)].map(m=>m[1]);
check("no duplicate shortcuts",new Set(defs).size===defs.length);
const order=/const DEFAULT_ORDER=\{([\s\S]*?)\n\};/.exec(src)[1];
[1,2].forEach(bar=>{
  const listed=[...new RegExp(bar+":\\[([\\s\\S]*?)\\]").exec(order)[1].matchAll(/"([a-z0-9]+)"/g)].map(m=>m[1]);
  const declared=cmds.filter(([,b])=>+b===bar).map(([c])=>c);
  check("bar "+bar+" order matches its commands",
    listed.slice().sort().join()===declared.slice().sort().join(),
    "listed "+listed.length+", declared "+declared.length);
});

// --- storage ----------------------------------------------------------------
check("no storage call bypasses the logging wrapper",
  !/(?<![A-Z_])STORE\.(get|set|delete|list)\(/.test(js),
  "a bare STORE call would fail silently");
check("workspace settings are both saved and restored",
  /logLevel:logLevel/.test(js)&&/o\.logLevel/.test(js),
  "a setting restored but not saved resets every launch");

/* A check for the flex-scroll fault was written here and REMOVED. It matched CSS rules
 * with a regex that could not reliably associate a rule with its element: it reported a
 * pass on a file with the fault present, and named a sibling (#askHead) for a fault in
 * #askBody. Both directions of wrong.
 *
 * An unreliable check is worse than no check, because it gets believed -- a green tick on
 * a broken file is exactly how the hidden-layer performance conclusion happened. Parsing
 * CSS properly needs a parser, not a regex, and that is not worth carrying here.
 *
 * The fault itself is covered by explicit tests in tests.js, which assert that #askBody,
 * #helpBody and #panelBody each declare min-height:0.
 */

// --- every blocking dialog can be dismissed ---------------------------------
/* A tap on the canvas while a blocking dialog is open used to return SILENTLY: the guard
   protected the drawing and swallowed the tap, so tapping outside dismissed nothing. On a
   wide screen there is no scrim either -- Settings docks as a real column -- so there was
   no way to close it by tapping at all. Board, Resize and Offset were listed as blocking
   and never closed.
 *
 * Matched on the id OR its toggle function, since some close via toggleSaveMenu(false)
 * rather than by id -- checking only the id reported two false positives. */
const blocking=((/const BLOCKING_MODALS=\[([^\]]*)\]/.exec(src)||["",""])[1])
  .split(",").map(x=>x.trim().replace(/^"|"$/g,"")).filter(Boolean);
const closer=(/function closeBlockingModals\(\)\{[\s\S]*?\n\}/.exec(src)||[""])[0];
const undismissable=blocking.filter(id=>{
  if(closer.includes('"'+id+'"'))return false;
  const cap=id.charAt(0).toUpperCase()+id.slice(1);
  return !closer.includes("toggle"+cap)&&!closer.includes("close"+cap);
});
check("every blocking dialog is closed by closeBlockingModals",!undismissable.length,
  undismissable.join(", ")+" would stay open on an outside tap");
check("a canvas tap dismisses rather than being swallowed",
  /if\(anyBlockingModal\(\)\)\{closeBlockingModals\(\);return;\}/.test(src),
  "returning silently left no way to close by tapping");

// --- storage keys are all reserved ------------------------------------------
/* The migration that once destroyed the symbol sets and templates did it by treating any
   unlisted dg: key as a stray drawing. So a new internal key that is not added to
   RESERVED_KEYS is a new key that gets eaten -- and PERF_KEY, the second storage probe and
   LEGACY_LIB_KEY were all missing when this check was written. */
/* Prefixes are covered by RESERVED_PREFIXES rather than RESERVED_KEYS, so both lists count
   -- checking only one flagged DOC_PREFIX, TPL_PREFIX and LIB_PREFIX, which are handled
   correctly. Naming matters here: a *_PREFIX is a namespace, a *_KEY is a single slot. */
const keyConsts=[...src.matchAll(/const ([A-Z_]+)="dg:/g)].map(m=>m[1])
  .filter(k=>!/_PREFIX$/.test(k));
const reservedBlock=((/const RESERVED_KEYS=\(\)=>\[[^\]]*\]/.exec(src)||[""])[0])+
  ((/const RESERVED_PREFIXES=[^;]*/.exec(src)||[""])[0]);
const unreserved=keyConsts.filter(k=>!reservedBlock.includes(k));
check("every storage key constant is reserved from migration",!unreserved.length,
  unreserved.join(", ")+" would be treated as a stray drawing");
const probes=[...src.matchAll(/"(dg:__probe\d*)"/g)].map(m=>m[1]);
const unreservedProbes=[...new Set(probes)].filter(p=>!reservedBlock.includes(p));
check("every storage probe is reserved",!unreservedProbes.length,unreservedProbes.join(", "));

// --- internal names in user-visible text ------------------------------------
/* A blanket rename of editable -> canSelect also rewrote four sentences the user reads,
   including "each is now independently canSelect and can be deleted on its own", which
   shipped and appeared in a log. Identifier renames must not touch prose, and the only
   reliable guard is to check the prose. */
const INTERNAL=["canSelect","canModify","styleTargets","writeTargets","objBBox","hitAt",
  "chainOf","segIntT","toS(","toM(","S.sel","S.entities","pend.pts","logLine"];
const leaked=[];
for(const m of src.matchAll(/note\(\s*"((?:[^"\\]|\\.)+)"/g))
  INTERNAL.forEach(w=>{if(m[1].includes(w))leaked.push('note: "'+m[1].slice(0,52)+'"');});
// and the same for any sentence-like string: three words or more with a space
for(const m of src.matchAll(/"((?:[^"\\]|\\.){12,})"/g)){
  const t=m[1];
  if(t.split(" ").length<3)continue;
  if(/[<>{}();=]/.test(t))continue;                 // markup or code, not prose
  INTERNAL.forEach(w=>{if(t.includes(w))leaked.push('"'+t.slice(0,52)+'"');});
}
check("no internal identifier appears in user-visible text",!leaked.length,
  [...new Set(leaked)].slice(0,4).join("  |  "));

// --- icons that look alike --------------------------------------------------
/* Uniqueness is not enough. To front and To back had different code points that were
   near-identical at toolbar size, and both outside common iOS font coverage -- so a
   missing glyph would have rendered the same fallback box for both. Related commands need
   glyphs that differ in SHAPE.
 *
 * Checked by codepoint neighbourhood: two glyphs within a few positions of each other in
 * the same Unicode block are usually the same shape mirrored or rotated, which is exactly
 * the trap. Commands in the same family are required to be further apart than that. */
const FAMILIES=[["front","back","forward","backward"],["rotcw","rotccw","fliph","flipv"],
  ["trim","extend","brk"],["group","ungroup","merge"]];
const tooClose=[];
FAMILIES.forEach(fam=>{
  const pts=fam.filter(c=>icons[c]).map(c=>[c,icons[c].codePointAt(0)]);
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const d=Math.abs(pts[i][1]-pts[j][1]);
    if(d>0&&d<=2)tooClose.push(pts[i][0]+"/"+pts[j][0]+" (U+"+
      pts[i][1].toString(16).toUpperCase()+" vs U+"+pts[j][1].toString(16).toUpperCase()+")");
  }
});
check("related commands do not use adjacent lookalike glyphs",!tooClose.length,
  tooClose.join(", ")+" \u2014 differ by direction only; pick shapes that differ");

// --- dead controls ----------------------------------------------------------
/* Two buttons shipped in Settings with no handler, because a patch aborted before its
   handler block landed. The existing check only looks for elements the script reaches
   for; nothing looked for controls that reach for nothing. */
const controls=[...html.matchAll(/<button[^>]*\bid="([^"]+)"/g)].map(m=>m[1])
  .concat([...html.matchAll(/<(?:input|select)[^>]*\bid="([^"]+)"/g)].map(m=>m[1]));
const dead=controls.filter(id=>{
  if(/^sn_/.test(id))return false;                    // wired via a computed id
  const q=id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return !new RegExp('\\$\\("'+q+'"\\)').test(js)&&
         !new RegExp('"'+q+'"').test(js);
});
check("every button and field is referenced by the script",!dead.length,dead.join(", "));

// --- version consistency ----------------------------------------------------
const ver=/APP_VERSION="([^"]+)"/.exec(src), hash=/APP_HASH="([^"]+)"/.exec(src);
check("the build carries a version and a hash",!!(ver&&hash),
  "APP_VERSION or APP_HASH is missing");
check("the hash is not still a placeholder",!!hash&&hash[1]!=="__HASH__",
  "release.sh stamps this; the file was copied without releasing");
if(ver&&fs.existsSync("CHANGELOG.md")){
  const cl=fs.readFileSync("CHANGELOG.md","utf8");
  const entry=new RegExp("^## "+ver[1].replace(/\./g,"\\.")+" .*build `([0-9a-f]+)`","m").exec(cl);
  check("CHANGELOG has an entry for this version",!!entry,"no '## "+ver[1]+"' heading");
  if(entry)check("CHANGELOG names this exact build",entry[1]===hash[1],
    "changelog says "+entry[1]+", file is "+hash[1]);
}

console.log(fails?"\n"+fails+" check(s) failed":"\nall checks passed");
process.exit(fails?1:0);
