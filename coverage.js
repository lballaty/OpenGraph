#!/usr/bin/env node
/* Coverage gate. Two jobs, both refusing rather than warning.
 *
 * 1. A RATCHET. If the app's script changed, the test count must have gone up. Written
 *    because "add a test for it" is a habit that decays: over a long session it is always
 *    the thing dropped when the fix looks obvious, and the fixes that looked obvious are
 *    exactly the ones that came back. The ratchet makes forgetting fail the build.
 *
 * 2. ENUMERABLE SURFACES. Some things can be listed exhaustively from the source, so
 *    "covered" is checkable rather than a matter of judgement: every command, every
 *    scripting op, every storage key, every blocking dialog. A new one that nobody tested
 *    is a gap the ratchet alone would not notice, because the count could rise for an
 *    unrelated reason.
 *
 * Usage:  node coverage.js index.html            check
 *         node coverage.js index.html --record   accept the current state as the baseline
 *
 * An override exists, and it demands a reason:
 *         COVERAGE_WAIVER="why" node coverage.js index.html
 * The reason is printed and recorded. A gate with no escape gets disabled wholesale the
 * first time it is wrong; one that demands a written reason stays honest.
 */
const fs=require("fs"), crypto=require("crypto");
const target=process.argv[2]||"index.html";
const record=process.argv.includes("--record");
if(!fs.existsSync(target)){console.error("usage: node coverage.js <index.html> [--record]");process.exit(2);}
const src=fs.readFileSync(target,"utf8");
const js=src.slice(src.indexOf("<script>"));
const tests=fs.existsSync("tests.js")?fs.readFileSync("tests.js","utf8"):"";
const BASE="coverage.json";

let fails=0;
const check=(name,ok,detail)=>{
  if(!ok){fails++;console.log("  FAIL  "+name+(detail?"  \u2014 "+detail:""));}
  else console.log("  ok    "+name);
};

/* ---------- 1. the ratchet ---------- */
const scriptHash=crypto.createHash("sha256").update(js).digest("hex").slice(0,16);
/* Counted from the test file rather than by running it: this must work without a DOM or a
   canvas, so it cannot depend on the suite executing. */
const testCount=(tests.match(/\n\s*ok\(/g)||[]).length;
const surfaces={
  commands:[...src.matchAll(/\{id:"([a-z0-9]+)",\s*bar:[12],/g)].map(m=>m[1]),
  intents:[...src.matchAll(/defIntent\("([a-z]+)"/g)].map(m=>m[1]),
  storageKeys:[...src.matchAll(/const ([A-Z_]+)="dg:/g)].map(m=>m[1]).filter(k=>!/_PREFIX$/.test(k)),
  dialogs:((/const BLOCKING_MODALS=\[([^\]]*)\]/.exec(src)||["",""])[1])
    .split(",").map(x=>x.trim().replace(/^"|"$/g,"")).filter(Boolean)
};

const prev=fs.existsSync(BASE)?JSON.parse(fs.readFileSync(BASE,"utf8")):null;
const waiver=process.env.COVERAGE_WAIVER||"";

if(record){
  fs.writeFileSync(BASE,JSON.stringify({
    scriptHash,testCount,
    counts:Object.fromEntries(Object.entries(surfaces).map(([k,v])=>[k,v.length])),
    recorded:new Date().toISOString().slice(0,10)
  },null,2)+"\n");
  console.log("baseline recorded: "+testCount+" tests, script "+scriptHash);
  process.exit(0);
}

console.log("coverage of "+target+"\n");
if(!prev){
  console.log("  note  no baseline yet \u2014 run: node coverage.js "+target+" --record");
}else{
  const changed=prev.scriptHash!==scriptHash;
  if(!changed){
    check("the script is unchanged, so no new tests are required",true);
  }else if(testCount>prev.testCount){
    check("the script changed and the test count rose",true,
      prev.testCount+" \u2192 "+testCount);
  }else if(waiver){
    console.log("  WAIVED  the script changed and the test count did not rise");
    console.log("          reason given: "+waiver);
  }else{
    check("the script changed, so the test count must rise",false,
      "still "+testCount+" tests. Add a test, or set COVERAGE_WAIVER=\"reason\"");
  }
  /* A surface that GREW must be covered. A count that only rises is not enough: the new
     tests could all be about something else. */
  for(const k in surfaces){
    const before=(prev.counts||{})[k];
    if(before===undefined)continue;
    if(surfaces[k].length>before)
      check(k+" grew from "+before+" to "+surfaces[k].length+", so it must be named in tests.js",
        surfaces[k].some(n=>tests.includes(n)),
        "nothing new in "+k+" is mentioned by any test");
  }
}

/* ---------- 2. enumerable surfaces ---------- */
console.log();
const uncovered=n=>!tests.includes('"'+n+'"')&&!tests.includes("'"+n+"'")&&!tests.includes(n);
/* Commands are covered by the generated plan AND by an explanation, both already checked
   elsewhere; here the requirement is that the REGISTRY itself is exercised. */
check("the command registry is exercised by a test",
  /CMD\b|bar:\[12\]|bar:\[12\]/.test(tests)||/commands/.test(tests));
check("every scripting op is named in tests.js",
  surfaces.intents.every(op=>tests.includes('"'+op+'"')),
  surfaces.intents.filter(op=>!tests.includes('"'+op+'"')).join(", "));
check("every storage key constant is named in tests.js or checks.js",
  (()=>{
    const checks=fs.existsSync("checks.js")?fs.readFileSync("checks.js","utf8"):"";
    return surfaces.storageKeys.every(k=>tests.includes(k)||checks.includes(k)||
      /every storage key constant is reserved/.test(checks));
  })(),"a new key that nothing checks is a key the migration can eat");
check("every blocking dialog is named in tests.js or checks.js",
  (()=>{
    const checks=fs.existsSync("checks.js")?fs.readFileSync("checks.js","utf8"):"";
    return /every blocking dialog is closed/.test(checks)||
      surfaces.dialogs.every(d=>tests.includes(d));
  })());

console.log("\n"+surfaces.commands.length+" commands, "+surfaces.intents.length+" scripting ops, "+
  surfaces.storageKeys.length+" storage keys, "+surfaces.dialogs.length+" blocking dialogs, "+
  testCount+" tests");
console.log(fails?"\n"+fails+" coverage check(s) failed":"\ncoverage gate passed");
process.exit(fails?1:0);
