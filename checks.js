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
