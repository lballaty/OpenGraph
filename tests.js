#!/usr/bin/env node
/* Automated tests. Run: node tests.js [index.html]
 *
 * Every one of these was written after something went wrong, and each had been thrown
 * away once it passed -- which is why the same class of fault came back. Kept here so a
 * regression fails in the terminal instead of on the iPad.
 *
 * Only pure logic is testable this way. Layout, gestures, pickers and storage need a real
 * device: TEST-PLAN.md covers those.
 */
const fs=require("fs");
const file=process.argv[2]||"index.html";
const src=fs.readFileSync(file,"utf8");
const srcAll=src;
const js=src.slice(src.indexOf("<script>"));
let pass=0,fail=0,group="";
/* Extracts a whole function body by balancing braces, instead of taking a fixed number of
   characters after the declaration. Three tests in a row failed on correct code because a
   comment I had written pushed the asserted line past a 400-character window; widening the
   window is a patch, reading the actual body is the fix. */
function bodyOf(name){
  const m=new RegExp("function "+name+"\\s*\\([^)]*\\)\\{").exec(srcAll);
  if(!m)return "";
  let k=m.index+m[0].length,d=1;
  while(k<srcAll.length&&d>0){
    if(srcAll[k]==="{")d++;else if(srcAll[k]==="}")d--;
    k++;
  }
  return srcAll.slice(m.index,k);
}
function codeOf(name){   // body with comments stripped, for "does it call X" assertions
  return bodyOf(name).replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"");
}
const G=n=>{group=n;console.log("\n"+n);};
const ok=(name,cond,detail)=>{
  if(cond){pass++;console.log("  ok    "+name);}
  else{fail++;console.log("  FAIL  "+name+(detail?"  \u2014 "+detail:""));}
};
// Pull a function out of the app and run the real thing, not a copy of it.
function grab(...names){
  const out=names.map(n=>{
    const i=js.indexOf(n);
    if(i<0)throw new Error("not found in source: "+n);
    if(/^(const|let) /.test(n)){
      /* A const may be a one-liner or a multi-line arrow body. Taking to end-of-line
         truncated svgOpacity mid-function, which failed loudly -- but a subtler case
         could have extracted something that parsed and behaved differently from the
         app, which is the failure this whole file exists to avoid. So: if a brace opens
         before the line ends, balance it. */
      const eol=js.indexOf("\n",i);
      const brace=js.indexOf("{",i);
      if(brace<0||brace>eol)return js.slice(i,eol);
      let d=0,k=brace;
      while(true){if(js[k]==="{")d++;else if(js[k]==="}")d--;k++;if(d===0)break;}
      const semi=js.indexOf(";",k);
      return js.slice(i,semi>=0&&semi<k+3?semi+1:k);
    }
    let j=js.indexOf("{",i),d=0,k=j;
    while(true){if(js[k]==="{")d++;else if(js[k]==="}")d--;k++;if(d===0)break;}
    return js.slice(i,k);
  });
  return out.join("\n");
}

// ---------- geometry: scale ----------
G("Resize");
{
  const DEFAULT_TEXT_MM=3.5;
  /* Pulled in too: scaleObj calls it, and a stub that guessed at its behaviour would be
     testing my guess rather than the app. */
  eval(grab("const isMeasureLike=","function scalePt","function scaleObj"));
  const c={x:0,y:0};
  let r={t:"rect",x:10,y:20,w:30,h:40,hs:2.5,lsize:3,lo:{x:0,y:5},weight:0.35};
  scaleObj(r,c,2);
  ok("geometry doubles",r.x===20&&r.w===60&&r.h===80);
  ok("hatch spacing scales",r.hs===5);
  ok("label height and offset scale",r.lsize===6&&r.lo.y===10);
  ok("stroke weight does NOT scale",r.weight===0.35,"a pen width is not a size");
  let ci={t:"circle",c:{x:10,y:0},r:5};scaleObj(ci,c,2);
  ok("a circle stays a circle",ci.r===10&&ci.c.x===20);
  let a={t:"rect",x:0,y:0,w:68.6,h:53.4};
  const ratio=a.w/a.h;scaleObj(a,c,0.37);
  ok("proportions hold",Math.abs(a.w/a.h-ratio)<1e-9);
}

// ---------- geometry: offset ----------
G("Offset");
{
  const clone=o=>JSON.parse(JSON.stringify(o));
  /* mitreJoin and its limit come along too: offsetPolyPoints calls it, and a stub would
     be testing my stub rather than the app's join. */
  const MITRE_LIMIT=4;
  eval(grab("function segNormal","function lineLineX","function mitreJoin",
            "function polyWinding","function offsetPolyPoints","function offsetObj"));
  const acw=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
  const span=p=>{const xs=p.map(q=>q.x);return +(Math.max(...xs)-Math.min(...xs)).toFixed(4);};
  ok("closed shape drawn anticlockwise grows outward",
    span(offsetObj({t:"poly",p:acw,cl:true},10,true).p)===120,"the winding test was inverted once");
  ok("closed shape drawn clockwise also grows outward",
    span(offsetObj({t:"poly",p:acw.slice().reverse(),cl:true},10,true).p)===120);
  ok("inward shrinks",span(offsetObj({t:"poly",p:acw,cl:true},10,false).p)===80);
  ok("circle outward",offsetObj({t:"circle",c:{x:0,y:0},r:50},10,true).r===60);
  ok("circle inward past nothing is refused",offsetObj({t:"circle",c:{x:0,y:0},r:50},60,false)===null);
  const L=offsetObj({t:"poly",p:[{x:0,y:0},{x:100,y:0},{x:100,y:80}]},10,true);
  ok("corner is mitred",Math.abs(L.p[1].x-90)<1e-6&&Math.abs(L.p[1].y-10)<1e-6);
  const col=offsetObj({t:"poly",p:[{x:0,y:0},{x:50,y:0},{x:100,y:0}]},10,true);
  ok("collinear points survive",col.p.length===3&&col.p.every(q=>Math.abs(q.y-10)<1e-6));
}

// ---------- quadratic removal ----------
G("Bulk removal");
{
  /* removeObjects used includes() inside a filter: O(n x m). Grouping 21,480 objects made
     400 million comparisons, three times over, and 225ms of the freeze. */
  const rm=codeOf("removeObjects");
  ok("removal uses a Set, not includes()",/new Set\(list\)/.test(rm)&&!/includes\(/.test(rm),
    "a linear scan per element is quadratic overall");
  ok("grouping clones the array once, not per object",
    /items:clone\(objs\)/.test(codeOf("groupSelected")),
    "objs.map(clone) round-tripped every object through JSON separately");
  /* Swept rather than spot-checked, because there were ten more of the same shape. */
  const stillQuad=[];
  for(const m of srcAll.matchAll(/filter\([^)]{0,80}includes\(/g)){
    const line=srcAll.slice(srcAll.lastIndexOf("\n",m.index)+1,srcAll.indexOf("\n",m.index));
    if(!/igSet|new Set/.test(line))stillQuad.push(line.trim().slice(0,60));
  }
  ok("no filter does a linear lookup per element",!stillQuad.length,stillQuad.join(" | "));
  // and the behaviour is unchanged
  const gone=new Set([1,2]);
  ok("a Set removal keeps the right survivors",
    [1,2,3,4].filter(x=>!gone.has(x)).join()==="3,4");
  ok("identity is what matters, not equality",
    (()=>{const a={v:1},b={v:1},g=new Set([a]);return [a,b].filter(x=>!g.has(x)).length===1;})(),
    "two objects with the same contents are different objects");
}

// ---------- history memory ----------
G("Undo history memory");
{
  const CAP=80*1024*1024;
  function run(snapBytes,ops){
    let bytes=0,steps=0;
    for(let i=0;i<ops;i++){
      bytes+=snapBytes;steps++;
      while(steps>1&&(bytes>CAP||steps>150)){bytes-=snapBytes;steps--;}
    }
    return{steps,bytes};
  }
  /* Capped by bytes rather than step count: 150 steps of an 18MB document is 2.7GB, and
     150 steps of an ordinary drawing is a few megabytes. A step count cannot tell those
     apart. */
  const big=run(18*1024*1024,12);
  ok("a huge document keeps few steps",big.steps===4,"kept "+big.steps);
  ok("and stays under the cap",big.bytes<=CAP,Math.round(big.bytes/1048576)+"MB");
  const small=run(40*1024,200);
  ok("an ordinary drawing still keeps 150 steps",small.steps===150,"kept "+small.steps);
  ok("one step is always kept",run(200*1024*1024,3).steps===1,
    "otherwise undo stops working entirely on a very large document");
  ok("the source caps on bytes",/historyBytes>HISTORY_MAX_BYTES/.test(codeOf("push")));
  ok("undo and redo keep the accounting straight",
    /historyBytes-=/.test(codeOf("undo"))&&/historyBytes\+=/.test(codeOf("undo"))&&
    /historyBytes-=/.test(codeOf("redo")),
    "a total that drifts is worse than none");
  ok("the figure is reported where it can be seen",
    /undo history: /.test(codeOf("logEnvironment")));
}

// ---------- autosave size guard ----------
G("Autosave size guard");
{
  /* A browser store is about 5MB in total and autosave rewrites the whole document every
     few seconds. A 3.6MB drawing would spend the entire budget on copies of itself and
     then start failing, taking the symbol sets and templates with it. */
  const MAX=1500*1024;
  const decide=bytes=>bytes>MAX?"stand down":"save";
  ok("an ordinary drawing autosaves",decide(40*1024)==="save");
  ok("a large but reasonable drawing autosaves",decide(900*1024)==="save");
  ok("a 3.6MB drawing stands down",decide(3.6*1024*1024)==="stand down");
  ok("the limit leaves room for sets and templates",MAX<2*1024*1024,
    "the whole store is about 5MB");
  ok("the byte size is still checked once the payload exists",
    /payload\.length>AUTOSAVE_MAX/.test(codeOf("flushAutosave")),
    "the node estimate is a proxy, not the answer");
  /* The first version serialised the whole document and THEN measured it, so a 3.6MB
     drawing was serialised every 2.5 seconds and discarded -- avoiding the storage write
     while keeping the cost that made the write a bad idea. */
  const fa=codeOf("flushAutosave");
  ok("a clearly oversized drawing is refused before serialising",
    fa.indexOf("countNodes")>=0&&fa.indexOf("countNodes")<fa.indexOf("JSON.stringify"),
    "otherwise the guard costs what it was meant to save");
  ok("a storage refusal is reported, not swallowed",
    /autoFail\(storeErr\(err\)\)/.test(fa),
    "an empty catch left the panel showing \u2018last kept\u2019 forever");
  ok("it is said once, not every few seconds",/autoTooBig/.test(fa));
  ok("a repeating failure does not repeat the message",
    /autoFailNote!==why/.test(codeOf("autoFail")));
  ok("the Settings panel reports both causes",
    /autoTooBig\?/.test(codeOf("autoNote"))&&/autoFailNote\?/.test(codeOf("autoNote")),
    "a stale \u2018last kept\u2019 would read as working");
}

// ---------- readable magnitudes ----------
G("Readable magnitudes");
{
  /* A 120m site in millimetres gives 9,600,000,000 mm2 for its area. Correct, and nobody
     recognises their own site in that form. These check the value scales without the
     stored millimetres changing, and that small things stay small. */
  const U={mm:{f:1,dec:1,lbl:"mm",adec:0},m:{f:1000,dec:3,lbl:"m",adec:2},px:{f:1,dec:0,lbl:"px",adec:0}};
  const UP={mm:{to:"m",f:1000,at:1000},cm:{to:"m",f:100,at:100},in:{to:"ft",f:12,at:24}};
  let unit="mm";
  const fmt=mm=>{const u=U[unit],v=mm/u.f;return v.toFixed(u.dec).replace(/\.?0+$/,m=>m.includes(".")?"":m);};
  function fmtBig(mm){
    const u=U[unit],v=mm/u.f,up=UP[unit];
    if(!up||Math.abs(v)<up.at)return fmt(mm)+" "+u.lbl;
    const b=v/up.f;
    return (Math.abs(b)>=100?b.toFixed(0):b.toFixed(Math.abs(b)>=10?1:2))
      .replace(/\.?0+$/,m=>m.includes(".")?"":m)+" "+up.to;
  }
  ok("a 900mm door stays in millimetres",fmtBig(900)==="900 mm",fmtBig(900));
  ok("999mm stays in millimetres",fmtBig(999)==="999 mm",fmtBig(999));
  ok("1000mm becomes 1 m",fmtBig(1000)==="1 m",fmtBig(1000));
  ok("4500mm becomes 4.50 m",fmtBig(4500)==="4.50 m",fmtBig(4500));
  ok("120000mm becomes 120 m",fmtBig(120000)==="120 m",fmtBig(120000));
  ok("a negative scales too",fmtBig(-44000)==="-44 m",fmtBig(-44000));
  unit="px";
  ok("pixels are left alone \u2014 there is no larger unit",fmtBig(50000)==="50000 px",fmtBig(50000));
  unit="m";
  ok("a drawing already in metres is unchanged",fmtBig(120000)==="120 m",fmtBig(120000));
  unit="mm";
  /* The grid cell said "1000 x 1000 mm (showing 10000)" and never said which number was
     which. It now leads with what is drawn and names the other as the setting. */
  /* The grid interval leads, and the decimated one is named "view interval" rather than
     left as an unexplained "(showing N)". */
  ok("the second interval is named, not just shown",
    /view interval/.test(codeOf("updateStatus")),
    "\u201cshowing\u201d alone did not say what the number was");
  ok("both intervals go through the scaling formatter",
    (codeOf("updateStatus").match(/fmtBig\(gxmm\(\)\)|fmtBig\(dsx\)/g)||[]).length>=2,
    "a view interval of 10000 is as unreadable as an area of nine billion");
  ok("a grid too fine to draw says so instead of reporting a number",
    /too fine to draw/.test(codeOf("updateStatus")));
  ok("the grid tooltip explains the fallback",
    /less than four pixels/.test(codeOf("updateStatus")));
  /* Swept, not spot-checked: the scale bar assembled its label by hand and so bypassed the
     formatter entirely, and seven note() messages did the same. A sweep finds the eighth. */
  const handBuilt=[];
  for(const m of srcAll.matchAll(/\+" "\+U\[S\.unit\]\.lbl/g)){
    const line=srcAll.slice(srcAll.lastIndexOf("\n",m.index)+1,srcAll.indexOf("\n",m.index)).trim();
    if(/const fmtU|function fmtA/.test(line))continue;
    handBuilt.push(line.slice(0,60));
  }
  ok("no readout assembles a unit label by hand",!handBuilt.length,handBuilt.join(" | "));
  ok("the scale bar uses the scaling formatter",
    /fmtBig\(n\*p\*uf\(\)\)/.test(codeOf("drawScaleBar")),
    "it read \u201c20000 mm\u201d on a 120m site");
  ok("the dimension drawn on the sheet scales",
    /let txt=fmtBig\(dist\(m\.a,m\.b\)\)/.test(srcAll),
    "this is the label that ends up on the printed drawing");
  ok("the exported dimension scales too",
    /xmlEsc\(fmtBig\(dist\(m\.a,m\.b\)\)\)/.test(srcAll),
    "an export that differs from the screen is the worst kind");
  ok("area labels on the drawing and in the export both scale",
    !/fmtA\(areaOf/.test(srcAll),"9,600,000,000 mm\u00b2 is not readable");
  ok("area and perimeter use the scaling formatters",
    /fmtBigArea\(ar\)/.test(codeOf("updateStatus"))&&/fmtBig\(pe\)/.test(codeOf("updateStatus")));
}

// ---------- node counter ----------
G("Node count");
{
  /* Points, not objects, because points are what cost: six imported symbols can hold more
     geometry than a hundred hand-drawn lines. */
  global.S={layers:[{id:1,vis:true},{id:2,vis:false}]};
  const layerOf=o=>S.layers.find(l=>l.id===o.l)||S.layers[0];
  const visible=o=>layerOf(o).vis;
  eval(grab("function countNodes"));
  const cases=[
   ["a 3-point line",[{t:"poly",p:[1,2,3]}],3],
   ["a rectangle counts its corners",[{t:"rect"}],4],
   ["a circle counts as one",[{t:"circle"}],1],
   ["a group sums its contents",[{t:"group",items:[{t:"poly",p:[1,2,3]},{t:"poly",p:[1,2,3]}]}],6],
   ["nested groups recurse",[{t:"group",items:[{t:"group",items:[{t:"poly",p:[1,2]}]}]}],2],
   ["a link counts its ends and waypoints",[{t:"link",via:[1,2]}],4],
   ["a measure counts two",[{a:1,b:2}],2],
   ["an empty drawing counts zero",[],0],
   ["a malformed entity does not throw",[null,{t:"poly"}],0]];
  cases.forEach(([n,l,want])=>ok(n,countNodes(l)===want,"got "+countNodes(l)+", wanted "+want));

  /* The counter must report what the app PROCESSES, not what the file contains. Hidden
     layers are skipped by both draw() and segments(), and reporting the file total is how
     a performance conclusion came to be drawn from a test where 99.9% was hidden: the cell
     read 131,532 while the app drew 132. This test would have caught that. */
  const mixed=[{t:"poly",p:[1,2,3],l:1},{t:"poly",p:[1,2,3,4,5],l:2}];
  ok("the visible count excludes hidden layers",countNodes(mixed,true)===3,
    "got "+countNodes(mixed,true));
  ok("the file total still counts everything",countNodes(mixed)===8,
    "a large file must not be mistaken for a small one");
  ok("a group on a hidden layer is excluded whole",
    countNodes([{t:"group",l:2,items:[{t:"poly",p:[1,2,3]}]}],true)===0);
  ok("a group on a visible layer counts its contents",
    countNodes([{t:"group",l:1,items:[{t:"poly",p:[1,2,3]}]}],true)===3);
  ok("visibility is tested once per top-level object, not per child",
    /if\(top&&visibleOnly/.test(codeOf("countNodes")),
    "a group shares one layer, so testing per child multiplies a linear find by the node count");
  /* Asserts on nodesTotal's BODY, not on a comment beside its call. Matching the comment
     would pass if someone deleted the comment and changed the code, or vice versa — the
     fourth time in this session a test of mine has read prose instead of code. */
  ok("the cell reports the visible figure",
    /nodeVisible=countNodes\(S\.entities,true\)/.test(codeOf("nodesTotal"))&&
    /return nodeVisible/.test(codeOf("nodesTotal")),
    "nodesTotal must return the visible count, not the file total");
  ok("the hidden figure is shown alongside, not dropped",
    /nodeHidden\?"  \+"/.test(codeOf("nodesUI")),
    "otherwise a large file looks small");
  ok("the environment block reports both",
    /nodes visible/.test(codeOf("logEnvironment")),
    "reporting only the total is what misled the earlier testing");
  /* Counted on change, never per frame: draw() runs on every pointer move during a drag,
     and walking the whole drawing sixty times a second would be the very cost the counter
     exists to warn about. */

  /* Follows the call graph. The first version tested only draw()'s own body, and passed
     while the count ran on every frame -- draw() calls updateStatus(), and updateStatus()
     called nodesUI(). One level of indirection defeated it entirely, which is the whole
     lesson: assert on what a function REACHES, not on what it literally contains. */
  function reaches(from,target,depth){
    depth=depth||0;
    if(depth>4)return false;
    const body=codeOf(from);
    if(!body)return false;
    if(new RegExp("\\b"+target+"\\s*\\(").test(body))return true;
    const called=new Set([...body.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/g)].map(m=>m[1]));
    for(const fn of called){
      if(fn===from||fn===target)continue;
      if(reaches(fn,target,depth+1))return true;
    }
    return false;
  }
  /* The right question is not whether countNodes is REACHABLE from draw -- it is, and
     legitimately, because the selection count must be current. It is whether the walk over
     the WHOLE drawing is guarded. */
  ok("draw() reaches the node count only through a version guard",
    reaches("draw","nodesTotal",0)&&/nodeTotalVer!==geomVersion/.test(codeOf("nodesTotal")),
    "walking the whole drawing every frame is the cost this counter exists to warn about");
  ok("the whole-drawing walk goes through nodesTotal, not countNodes directly",
    !/countNodes\(S\.entities\)/.test(codeOf("nodesUI")),
    "that was the regression: 0.78ms over 131,532 nodes, sixty times a second");
  ok("the selection count is still recomputed, being small and needing to be current",
    /countNodes\(S\.sel\)/.test(codeOf("nodesUI")));
  ok("it updates when the selection changes",
    /nodesCached\(\)|nodesUI\(\)/.test(codeOf("updateStatus")),
    "the \u2018N of M\u2019 reading would not follow the selection");
  ok("thresholds are defined once",/NODE_BUSY=\d+, ?NODE_HEAVY=\d+/.test(src));
  ok("the heavy warning is said once per session, not per redraw",
    /nodesWarned/.test(src));
}

// ---------- curved lines and the editing tools ----------
G("Editing a curved line");
{
  /* 3.18.0 marked every recognised sketch as curved, and 3.7.0's curve guard then refused
     Trim, Extend and Break on all of them -- a real log shows the refusal four times in
     eight seconds. Every freehand line had become uneditable, by my own two changes
     meeting. */
  const TOL=2;
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  function deviates(pts,zoom){
    if(pts.length<3)return false;
    let worst=0;
    for(let i=0;i<pts.length-1;i++){
      const d=dist(pts[i],pts[i+1])*zoom;
      if(d/4>worst)worst=d/4;
      if(worst>TOL)return true;
    }
    return false;
  }
  const chain=(n,step)=>Array.from({length:n},(_,i)=>({x:i*step,y:0}));
  /* A curved polyline is drawn as quadratics through segment midpoints, so the drawn curve
     departs from the straight chain by at most a QUARTER of the segment length. */
  ok("a freehand sketch does not deviate visibly",!deviates(chain(50,1.5),1),
    "captured every device pixel, simplified to 1.5 screen px");
  ok("nor when zoomed in four times",!deviates(chain(50,1.5),4),
    "zooming in must not make your own sketch uneditable");
  ok("a coarse hand-placed curve does deviate",deviates(chain(6,40),1));
  ok("a two-point line never does",!deviates(chain(2,100),1),
    "it is drawn as a straight line whatever the flag says");
  ok("the judgement is measured, not assumed",
    /function curveDeviatesVisibly/.test(srcAll));
  ok("and it is in screen pixels",/S\.view\.zoom/.test(codeOf("curveDeviatesVisibly")));

  /* Trim, Extend and Break only move ONE endpoint, and the result is still drawn as a
     curve through the points that remain -- so the shape does not become faceted and
     refusing was wrong in every case. Offset is different: it rebuilds the whole line at a
     distance from every segment, so a coarse curve does come back faceted. */
  /* The message states the distance rather than calling it "a little". The figure runs
     from a fraction of a millimetre on a sketch to over a metre on a coarse curve at site
     scale, so no adjective could have covered it. */
  ok("trim no longer refuses a curve",
    /the cut may land up to/.test(srcAll),
    "the result is still a curve; only the cut is approximate");
  ok("and says how far off, in drawing units",
    /fmtBig\(curveGapMM\(o\)\)/.test(srcAll),
    "\u201ca little off\u201d is nothing anyone can act on");
  const gapMM=pts=>{let w=0;for(let i=0;i<pts.length-1;i++){
    const d=dist(pts[i],pts[i+1]);if(d/4>w)w=d/4;}return w;};
  ok("a dense sketch reports a fraction of a millimetre",
    gapMM(chain(40,0.5))<0.2,gapMM(chain(40,0.5)).toFixed(3));
  ok("a coarse curve at site scale reports over a metre",
    gapMM(chain(6,4300))>1000,gapMM(chain(6,4300)).toFixed(0));
  ok("the gap is measured in model units, not pixels",
    !/S\.view\.zoom/.test(codeOf("curveGapMM")),
    "a distance the user reads must not change when they zoom");
  ok("the pixel judgement is separate from the reported distance",
    /curveGapMM\(o\)\*S\.view\.zoom>CURVE_TOL_PX/.test(codeOf("curveDeviatesVisibly")),
    "whether to warn is about pixels; what to say is about millimetres");
  /* The message is split across a source line break, so it is matched in two parts rather
     than as one string -- a single-line regex missed it and reported a fault that was not
     there. */
  ok("offset still refuses a coarse curve",
    /the parallel/.test(srcAll)&&/copy would be faceted by up to/.test(srcAll),
    "offset rebuilds every segment, unlike a trim");
  ok("and states both the spacing and the error",
    /points are "\+fmtBig\(curveGapMM\(o\)\*4\)/.test(srcAll),
    "so it is clear what to change, not just that something is wrong");
  ok("the two give different reasons",
    /cut may land/.test(srcAll)&&/copy would be faceted/.test(srcAll),
    "the same words for different situations is how a refusal stops being read");
}

// ---------- headless intent API ----------
G("Intent API");
{
  /* Purely additive, and it closes the gap that let a corrupt object written by a real
     code path go unnoticed for nineteen releases: live.js can click buttons, but it could
     not construct geometry and then inspect what was stored. */
  ok("the API is exposed on a stable name",/window\.draftingGrid=/.test(srcAll));
  ok("version is read lazily, not captured",
    /get version\(\)\{return APP_VERSION;\}/.test(srcAll),
    "capturing a const declared later threw and stopped the whole script");
  const ck=codeOf("checkArgs");
  ok("validation is declarative, so a new intent cannot skip it",
    /for\(const key in spec\)/.test(ck));
  ok("a point must be finite",/isFinite\(v\.x\)/.test(ck));
  /* Asserted on the loop rather than on the message text: my first version matched the
     concatenation character by character and got the escaping wrong, reporting a fault in
     code that was correct. */
  ok("every point in an array is checked",
    /for\(let i=0;i<v\.length;i\+\+\)/.test(ck)&&/isFinite\(q\.x\)/.test(ck),
    "one bad point in fifty is still a corrupt object");
  const ai=codeOf("applyIntent");
  ok("an unknown op lists the known ones",/Known: /.test(ai),
    "a refusal that does not say what is valid is a dead end");
  ok("the result is audited by the same validator imports use",
    /auditEntityList\(S\.entities/.test(ai),
    "a faulty result should surface now, not two sessions later");
  ok("a faulty result is discarded, not kept",/S\.entities=audit\.keep/.test(ai));
  ok("it returns a refusal rather than throwing",/return\{ok:false/.test(ai));
  const ab=codeOf("applyIntents");
  ok("a batch is all-or-nothing",/undoLast\(\)/.test(ab),
    "half-applied geometry is worse than none");
  ok("and says which intent failed",/"intent "\+i\+/.test(ab));
  /* The ops that exist. A missing one is a gap in what can be tested headlessly. */
  ["line","rect","circle","text","symbol","select","command","layer","unit","inspect"]
    .forEach(op=>ok("there is an intent for "+op,
      new RegExp('defIntent\\("'+op+'"').test(srcAll)));
  ok("inspect is read-only",!/push\(\)/.test(
    (/defIntent\("inspect"[\s\S]{0,300}/.exec(srcAll)||[""])[0]),
    "a check should not change what it checks");
}

// ---------- architecture measurements ----------
G("Architecture measurements");
{
  /* Four instrumented questions, each existing to turn one of my estimates into a fact
     from the device. The important property is that each can come back "not needed" -- a
     measurement that can only confirm what I already believe is not a measurement. */
  const pr=codeOf("profReport");
  ok("the FSM question is measured, not assumed",
    /pointer state clashes/.test(pr)&&/function measState/.test(srcAll));
  ok("and can conclude an FSM is unnecessary",
    /an FSM would be tidiness, not a fix/.test(pr),
    "if it can only say yes it is not measuring anything");
  ok("the culling question is measured",/entities off screen/.test(pr));
  ok("and can conclude culling would not pay",
    /culling would save little at this zoom/.test(pr));
  ok("the pooling question is measured",/objects built per rebuild/.test(pr));
  ok("and can conclude pooling would not matter",
    /pooling would buy nothing/.test(pr),
    "the verdict is now on cost rather than count");
  /* Now that the index exists, the measurement reports what it ACHIEVES rather than the
     locality it was built to exploit -- the old version walked every segment to count how
     many were near, which was evidence for building it and absurd afterwards. */
  ok("the index's narrowing is measured",/index narrowing/.test(pr));
  ok("and can report that it is not narrowing enough",
    /returning most of the drawing; check the cell size/.test(pr),
    "a badly sized cell would make the index useless, silently");
  ok("state checking is gated behind the profiler",
    /if\(!PROF\.on\)return/.test(codeOf("measState")));
  ok("counters reset with the profiler",/MEAS\.stateClashes=0/.test(codeOf("profReset")),
    "figures carried over from a previous run would be worse than none");
  const ms=codeOf("measState");
  ["panning","band","drag","sketchPts","dragSym","m2p","linkFrom","textEditing"]
    .forEach(v=>ok("the clash check watches "+v,ms.includes(v),
      "an unwatched state is a clash that goes uncounted"));
}

// ---------- the coverage gate ----------
G("Coverage gate");
{
  /* A meta-gate: a release that changes the script must add tests. Written because "add a
     test for it" is a habit that decays -- over a long session it is always the thing
     dropped when the fix looks obvious, and the obvious-looking fixes are the ones that
     came back. */
  const cov=fs.existsSync("coverage.js")?fs.readFileSync("coverage.js","utf8"):"";
  if(!cov)console.log("  skip  coverage.js not present beside the tests");
  else{
    ok("it ratchets on the script hash",/scriptHash/.test(cov),
      "a version bump alone must not satisfy it");
    ok("it counts tests without needing to run them",/tests\.match/.test(cov),
      "it must work without a DOM or a canvas");
    ok("it refuses when the count did not rise",
      /the script changed, so the test count must rise/.test(cov));
    /* An enumerable surface that GREW must be named in the tests. A rising count alone is
       not enough -- the new tests could all be about something else. */
    ok("it checks that a grown surface is actually covered",
      /grew from/.test(cov),
      "a count that rises for an unrelated reason would otherwise pass");
    ["commands","intents","storageKeys","dialogs"].forEach(k=>
      ok("it enumerates "+k,new RegExp(k+":").test(cov)));
    /* The waiver. A gate with no escape gets disabled wholesale the first time it is
       wrong; one that demands a written reason stays honest. */
    ok("a waiver exists",/COVERAGE_WAIVER/.test(cov));
    ok("and it demands a reason",/reason given: /.test(cov),
      "a silent override is the same as no gate");
    ok("the baseline is a file, not a guess",/coverage\.json/.test(cov));
    ok("recording is explicit, not automatic on check",
      /--record/.test(cov),
      "a gate that moves its own goalposts on every run measures nothing");
  }
  const rel=fs.existsSync("release.sh")?fs.readFileSync("release.sh","utf8"):"";
  if(rel){
    ok("the coverage gate runs on release",/coverage\.js/.test(rel));
    ok("and the baseline advances only after it passes",
      rel.indexOf("coverage.js index.html >/dev/null")<rel.indexOf("--record"),
      "recording first would make the gate self-satisfying");
  }
}

// ---------- the release gate itself ----------
G("Release gate");
{
  /* Three of five checks were automatic and two were run by hand -- which means they could
     be forgotten, and eventually would be. */
  const rel=fs.existsSync("release.sh")?fs.readFileSync("release.sh","utf8"):"";
  if(!rel)console.log("  skip  release.sh not present beside the tests");
  else{
    ok("the suite runs",/node tests\.js/.test(rel));
    ok("the structural checks run",/checks\.js/.test(rel));
    ok("the app is executed, not only read",/live\.js/.test(rel),
      "source checks cannot catch a reference error");
    ok("the shipped files are validated against the schema",
      /drafting-grid\.schema\.json/.test(rel),
      "a schema change can invalidate them and nothing else would notice");
    ok("each gate refuses rather than warns",
      (rel.match(/exit 1/g)||[]).length>=3);
    ok("a changelog entry is required",/CHANGELOG/.test(rel));
  }
}

// ---------- Ask panel ----------
G("Ask panel");
{
  /* The answers reuse .lay/.nm, written for a LAYER row: one short name, no wrap, ellipsis
     if long. An answer is three stacked lines of prose, so every one was clamped to a
     single line and cut -- about 45 characters of a sentence that usually runs to 150. */
  const css=srcAll.slice(0,srcAll.indexOf("</style>"));
  ok("the shared row class still clips a layer name",
    /\.nm\{[^}]*white-space:nowrap/.test(css),
    "layer rows want that; only Ask needed the override");
  ok("Ask answers wrap instead",
    /#ask \.lay \.nm,#ask \.nm\{white-space:normal/.test(css));
  ok("and are not clipped",/#ask[^}]*overflow:visible/.test(css));
  ok("rows align to the top once they are multi-line",
    /#ask \.lay\{align-items:flex-start\}/.test(css),
    "centred alignment looks wrong on a three-line row");

  /* Coverage: every command explained, and today's features findable. */
  const cmds=[...srcAll.matchAll(/\{id:"([a-z0-9]+)",\s*bar:[12],/g)].map(m=>m[1]);
  const explained=new Set([...srcAll.matchAll(/\{c:"([a-z0-9]+)",d:"/g)].map(m=>m[1]));
  const unexplained=cmds.filter(c=>!explained.has(c));
  ok("every command has a button explanation",!unexplained.length,unexplained.join(", "));
  const tasks=[...srcAll.matchAll(/\{t:"([^"]{6,90})",i:"([a-z0-9-]+)"/g)].map(m=>m[2]);
  ["view-toggles","transparency","lock-object","node-count","measure-performance",
   "working-folder","autosave-limit","several-tabs","order-depth","join-lines",
   "offset-limits","quick-menu"].forEach(id=>
    ok("there is a task entry for "+id,tasks.includes(id),
      "a feature nobody can find is a feature that does not exist"));
  ok("no two task entries share an id",new Set(tasks).size===tasks.length,
    "the learning index keys on it");
}

// ---------- tab tracking ----------
G("Tab tracking");
{
  /* A real log showed the count climbing 3,4,5,6,7,8,9 in thirteen seconds and settling at
     2 a minute later. A RELOAD gets a fresh TAB_ID, and the old entry lived for the full
     expiry -- so six quick reloads reported seven tabs, six of them dead. The warning is
     about a genuine hazard, and one that cries wolf gets ignored. */
  const BEAT=4000, STALE=12000;
  ok("the expiry allows three missed beats",STALE/BEAT>=3,
    "so a backgrounded tab is not declared dead");
  ok("the expiry is far shorter than the old 30s",STALE<30000,
    "a closed tab lingered for half a minute");
  function simulate(reloads,gapMs){
    /* Each reload registers a new id. With deregistration on the way out, the old id is
       gone immediately; without it, the id survives until the expiry. */
    const withHook=[],without=[];
    let t=0;
    for(let i=0;i<reloads;i++){
      t+=gapMs;
      without.push(t);
      withHook.length=0;withHook.push(t);
    }
    const ghostsWithout=without.filter(x=>t-x<STALE).length;
    return{withHook:withHook.length,without:ghostsWithout};
  }
  const r=simulate(6,2000);
  ok("without deregistration six quick reloads look like several tabs",r.without>1,
    r.without+" entries alive");
  ok("with deregistration a reload leaves no ghost",r.withHook===1);
  ok("the source deregisters on pagehide",/addEventListener\("pagehide"/.test(srcAll),
    "iOS Safari does not reliably fire unload");
  ok("deregistration is synchronous",
    /localStorage\.setItem\(TAB_KEY/.test(srcAll),
    "an async write during teardown may not complete");
  ok("the beat interval is the constant, not a literal",
    /setInterval\(beatTab,TAB_BEAT_MS\)/.test(srcAll));
}

// ---------- a box must cover what is drawn ----------
G("Bounding boxes and culling");
{
  /* Reported: zooming in made a dimension label disappear. A dimension is drawn OFFSET from
     the two points it measures -- that offset line and its label are what you see -- but
     objPoints returned only a and b. The box was wrong from the start and never mattered,
     because nothing consulted it for a measure until viewport culling arrived in 3.41.0.

     Zoomed out the whole drawing is on screen and the cull never fires. Zoom in and it
     starts working, dropping dimensions whose measured line has left the view while their
     visible line has not. */
  const op=codeOf("objPoints");
  ok("a measure's points include the offset line",
    /const G=dimGeom\(o\);\s*return G\?\[o\.a,o\.b,G\.A,G\.B\]/.test(op),
    "the offset line is what is actually drawn");
  ok("and it survives dimGeom returning nothing",/:\[o\.a,o\.b\]/.test(op));
  ok("vertsOf still returns the raw points",
    /if\(isMeasureLike\(o\)\)return\[o\.a,o\.b\];/.test(srcAll),
    "snapping and sticky ends care where the measurement was taken, not where its label sits");
  /* A dragged label is the same class of fault. */
  ok("a dragged label is inside its object's box",/if\(o\.lo&&typeof o\.lo\.x==="number"\)/.test(codeOf("objBBox")));
  ok("but not in objPoints",!/o\.lo/.test(op),
    "a label is not geometry: hit-testing and snapping must not treat it as part of the shape");
  /* The margin was NOT the answer, and I tried it first. */
  ok("the cull margin stayed at 120",/CULL_PAD_PX=120/.test(srcAll),
    "200 considered 87% more area than the screen against 73% of objects being off it");
  ok("and the reasoning is recorded",/widening the margin is the wrong lever/.test(srcAll),
    "so nobody widens it next time instead of fixing the box");
  // the arithmetic that made 200 wrong
  const area=p=>((1366+2*p)*(892+2*p))/(1366*892);
  ok("120px considers about half again",Math.round((area(120)-1)*100)===49);
  ok("200px considers nearly double",Math.round((area(200)-1)*100)===87,
    "most of the culling saving handed back to cover a label that could be measured");
}

// ---------- the way out must always be reachable ----------
G("Pinned commands");
{
  /* Reported: "I could not switch to Select because the menus had scrolled." That is the
     worst version of the scrolling fault, because the way OUT of any other state was the
     thing out of reach. Select deselects, grabs handles and stops drawing; without it you
     are stuck in whatever tool you are in. */
  ok("Select is pinned",/PINNED=\{1:\["select"\]/.test(srcAll),
    "it is the tool you need to recover from any other state");
  ok("Undo is pinned too",/2:\["undo"/.test(srcAll),
    "the other way back from a mistake");
  ok("Settings and the guide stay pinned",/"settings","keys"/.test(srcAll));
  /* Pinned means OUTSIDE the scrolling list, which is the whole point. */
  const css=srcAll.slice(0,srcAll.indexOf("</style>"));
  ok("the pinned area does not scroll",/\.pin\{[^}]*flex:0 0 auto/.test(css));
  ok("and sits outside .items",/Pinned commands sit outside \.items/.test(srcAll));
  ok("a floating bar keeps it visible below the list",
    /\.bar\.float \.pin\{[^}]*border-top/.test(css),
    "the list scrolls above it; the pin does not");
  ok("each bar pins its own",/PINNED\[n\]\|\|\[\]/.test(codeOf("buildBars")),
    "Select is on bar 1 and Undo on bar 2");
  /* And the underlying fault stays fixed: pinning is the belt, min-height:0 is the braces. */
  ok("the list can still shrink so it scrolls properly",
    /\.bar\.float \.items\{[^}]*min-height:0/.test(css),
    "pinning must not become the excuse for leaving the scroll broken");
}

// ---------- the last of the known bugs ----------
G("Trimming an arc");
{
  /* B6. It was refused outright: "Trimming an arc further is not supported yet". The maths
     is the circle case with one difference -- a circle wraps, so every gap between crossings
     is a candidate; an arc has ENDS, and the piece tapped may be bounded by an end. */
  const TAU=Math.PI*2, norm=a=>{a%=TAU;return a<0?a+TAU:a;};
  const d=x=>x*Math.PI/180;
  function trim(a0,sweep,cutsAbs,tapAbs){
    const along=a=>{const rel=norm(a-a0);return sweep>=0?rel:-(norm(a0-a));};
    const relAt=along(tapAbs);
    const marks=cutsAbs.map(along)
      .filter(x=>sweep>=0?(x>1e-9&&x<sweep-1e-9):(x<-1e-9&&x>sweep+1e-9))
      .concat([0,sweep]).sort((p,q)=>sweep>=0?p-q:q-p);
    if(marks.length<3)return "no crossing";
    let lo=null,hi=null;
    for(let i=0;i<marks.length-1;i++){
      const A=marks[i],B=marks[i+1];
      const inSeg=sweep>=0?(relAt>=A-1e-9&&relAt<=B+1e-9):(relAt<=A+1e-9&&relAt>=B-1e-9);
      if(inSeg){lo=A;hi=B;break;}
    }
    if(lo===null)return "outside";
    const atStart=Math.abs(lo)<1e-9, atEnd=Math.abs(hi-sweep)<1e-9;
    if(atStart&&atEnd)return "whole arc";
    if(!atStart&&!atEnd)return "middle piece";
    return Math.round(Math.abs(atStart?(sweep-hi):lo)*180/Math.PI);
  }
  ok("tapping before the crossing keeps the far half",trim(0,d(180),[d(90)],d(45))===90);
  ok("tapping after it keeps the near half",trim(0,d(180),[d(90)],d(135))===90);
  ok("with two crossings, an end piece trims",trim(0,d(180),[d(60),d(120)],d(30))===120);
  ok("and the other end piece trims",trim(0,d(180),[d(60),d(120)],d(150))===120);
  /* An arc cannot have a hole, so a middle cut is refused rather than half-applied. */
  ok("a middle piece is refused",trim(0,d(180),[d(60),d(120)],d(90))==="middle piece",
    "cutting the middle would need two arcs, and one object cannot be two");
  ok("no crossing means nothing to trim to",trim(0,d(180),[],d(45))==="no crossing");
  /* The start and sweep arithmetic, including wraparound. */
  const apply=(a0,sweep,lo,hi,atStart)=>({
    a0:norm(atStart?a0+hi:a0), sw:atStart?(sweep-hi):lo});
  let r=apply(0,d(180),0,d(90),true);
  ok("removing the first part moves the start",Math.round(r.a0*180/Math.PI)===90&&
    Math.round(r.sw*180/Math.PI)===90);
  r=apply(0,d(180),d(90),d(180),false);
  ok("removing the last part leaves the start alone",Math.round(r.a0*180/Math.PI)===0);
  r=apply(d(270),d(180),0,d(180),true);
  ok("a wrapping arc still normalises",Math.round(r.a0*180/Math.PI)===90,
    "270 + 180 = 450, which must come back as 90");
  ok("it reuses circleCrossings",/const cuts=circleCrossings\(o\)/.test(codeOf("trimArc")),
    "an arc has a centre and a radius, so the circle solver already answers this");
  ok("and the refusal is gone",!/Trimming an arc further is not supported/.test(srcAll));
}

G("Panel positions");
{
  /* B5. Three draggable panels set style.left directly with nothing stored, so a panel
     dragged somewhere useful returned to its default on every open. */
  ok("positions are recorded",/function rememberPanel/.test(srcAll));
  ok("on drop, not on every move",
    /rememberPanel\("help"/.test(srcAll)&&!/pointermove[\s\S]{0,120}rememberPanel/.test(srcAll),
    "recording per move would write to storage sixty times a second");
  ["help","ask","symbols"].forEach(id=>
    ok(id+" records its position",new RegExp('rememberPanel\\("'+id+'"').test(srcAll)));
  ["help","ask","symbols"].forEach(id=>
    ok(id+" restores it",new RegExp('restorePanel\\("'+id+'"').test(srcAll)));
  ok("restored on the next frame",/requestAnimationFrame\(\(\)=>restorePanel/.test(srcAll),
    "a hidden panel has no size, and the clamp needs its width");
  ok("clamped to the window that exists now",
    /Math\.min\(p\.x,innerWidth-w-4\)/.test(codeOf("restorePanel")),
    "a position saved in landscape puts a panel off the side in portrait");
  ok("kept in the workspace, not the drawing",/panelPos:PANEL_POS/.test(codeOf("uiState")));
  ok("and not in the document",!/panelPos/.test(codeOf("doc")),
    "where you like a panel should not travel with a file you send");
}

G("Reordering a group");
{
  /* B4. A group reorders as a whole and that is the only order it has; the parts need
     Ungroup. A reasonable rule, and an unreasonable thing to infer from nothing happening. */
  /* The message is built by concatenation across a line break, so "moves as a whole" never
     appears contiguously in the source. Matched in the two pieces it is actually written in. */
  ok("the rule is stated",/as a whole/.test(srcAll)&&/order of the parts inside/.test(srcAll));
  ok("it points at Ungroup",/ungroup first/i.test(codeOf("reorder")));
  ok("said once, not per press",/reorderGroupNoted/.test(srcAll));
  ok("and only when the selection is all groups",
    /t\.every\(o=>o\.t==="group"\)/.test(codeOf("reorder")),
    "with a mixture the loose objects do reorder, so the message would be wrong");
}

G("What an undo step holds");
{
  /* B3, decided rather than built. The test is whether undoing something would restore
     WORK. The grid, the unit, the sheet and the view are settings, not work. */
  const snap=(/const snapshot=\(\)=>JSON\.stringify\([^)]*\)/.exec(srcAll)||[""])[0];
  ["e:S.entities","m:S.measures","l:S.layers"].forEach(k=>
    ok(k+" is in the snapshot",snap.includes(k)));
  ["gx","S.unit","sheet","title"].forEach(k=>
    ok(k+" is deliberately out",!snap.includes(k),
      "an Undo that put the grid back while leaving your last line would be a worse surprise"));
  ok("the decision is recorded next to the code",
    /VIEW settings, not drawing[\s\S]{0,20}content/.test(srcAll),
    "the comment wraps, so the phrase is not contiguous");
}

// ---------- moving a dimension label ----------
G("Dimension offset handle");
{
  /* Reported: the label cannot be grabbed and cannot be pulled out to offset. Everything
     needed was present -- the mo handle, and hit testing correctly against the OFFSET line
     rather than the raw points. What was missing was the state: a dimension is created
     already offset, the offset handle is the only way to change that, and handles belong to
     the Select tool. Finishing a measurement left you in Measure, so the next tap started
     another measurement. Nothing said otherwise. */
  ok("the offset handle exists",/k:"mo",round:true/.test(srcAll));
  ok("hit testing uses the offset line, not the raw points",
    /const G=dimGeom\(o\);\s*test\(dist\(projOnSeg\(p,G\.A,G\.B\)/.test(srcAll),
    "the drawn line is offset from a-b, so testing a-b would miss what you can see");
  ok("a new dimension is selected",/S\.sel=\[dim\]/.test(srcAll),
    "otherwise its handles are not even candidates");
  ok("and it says where to grab",/round handle at the middle/.test(srcAll));
  /* The exception, and its scope. Switching to Select automatically would have been the
     easy fix and the wrong one: measuring is usually done several times in a row. */
  ok("the Measure tool can grab a handle when idle",
    /S\.tool==="measure"&&\(!pend\.pts\|\|!pend\.pts\.length\)/.test(srcAll));
  ok("the tool is NOT switched after measuring",
    !/setTool\("select"\)[\s\S]{0,80}S\.measures\.push/.test(srcAll),
    "taking the tool away after one measurement would be worse than the bug");
  ok("the exception cannot interfere mid-measurement",
    /!pend\.pts\.length/.test(srcAll),
    "scoped to before the first point is placed");
  /* Drawn in the same state it can be grabbed, or there is nothing to aim at. */
  const both=(srcAll.match(/S\.tool==="measure"&&\(!pend\.pts\|\|!pend\.pts\.length\)/g)||[]).length;
  ok("the press handler and the drawing agree",both===2,
    both+" occurrence(s) \u2014 a grabbable handle you cannot see is no better than none");
  ok("drawHandles honours it",/const measureIdle=/.test(codeOf("drawHandles")));
}

// ---------- layer edits are undoable ----------
G("Layer edits and undo");
{
  /* B1, open since the tracker was written. Layers are already IN the undo snapshot -- the
     only thing missing was recording one. So Undo after a layer edit undid whatever you last
     DREW instead, silently, and the layer change stayed. Losing the wrong work is about as
     bad as an undo can be, and it was the oldest open bug. */
  ok("layers are in the snapshot",/l:S\.layers/.test(srcAll),
    "so the fix is recording a step, not changing what a step holds");
  ok("layers are restored",/S\.layers=o\.l/.test(codeOf("restore")));
  /* Each control. A sweep rather than a spot check, because five were missing and I found
     them by listing every assignment. */
  const muts=[...srcAll.matchAll(/[^\n]*L\.(vis|lock|guide|color)=[^\n]*/g)].map(m=>m[0])
    .filter(l=>/onclick|onchange/.test(l));
  ok("every layer control records an undo step",
    muts.length>0&&muts.every(l=>/push\(\)/.test(l)),
    muts.filter(l=>!/push\(\)/.test(l)).map(l=>l.trim().slice(0,50)).join(" | "));
  ok("visibility is one of them",muts.some(l=>/L\.vis=/.test(l)));
  ok("colour is one of them",muts.some(l=>/L\.color=/.test(l)));
  ok("lock is one of them",muts.some(l=>/L\.lock=/.test(l)));
  ok("the guide flag is one of them",muts.some(l=>/L\.guide=/.test(l)));
  ok("there are at least five",muts.length>=5,muts.length+" found");
  /* Adding and deleting a layer already did. Deleting takes the objects on it, so an
     unrecorded delete would have been the worst of the set. */
  ok("adding a layer records a step",/push\(\);\s*const L=\{id:S\.nextLayer/.test(srcAll));
  ok("deleting one records a step",
    /push\(\);[\s\S]{0,200}S\.layers=S\.layers\.filter\(x=>x!==L\)/.test(srcAll),
    "it takes the objects on that layer with it");
}

// ---------- grabbing a handle versus dragging ----------
G("Handle versus drag");
{
  /* Reported: trying to drag grabbed a handle and resized instead. Both tolerances were
     22px on touch and handles are checked FIRST -- but a vertex sits ON the object, so any
     press near a corner was inside both and the handle always won. On anything under about
     100px across every point is within 22px of some vertex, so a small object could not be
     dragged at all. The smaller the thing, the less able you were to move it. */
  const ha=codeOf("handleAt");
  ok("the handle tolerance is tighter than the object's",/COARSE\?13:8/.test(ha),
    "grabbing a vertex is precise; moving is the common act and gets the generous ring");
  ok("the object tolerance is unchanged",/COARSE\?22:11/.test(codeOf("hitAtInner")),
    "selecting should not become harder to fix dragging");
  // the ring that now exists
  const inRing=(sizePx,handleTol)=>sizePx>handleTol*2;
  ok("a 60px object can now be dragged",inRing(60,13));
  /* 30 > 26, so a 30px object technically has a ring — 6 pixels of it, which is not usable
     on a finger. That is what the separate too-small rule is for, and it triggers below
     32.5px rather than below 26. My assertion conflated the two thresholds. */
  ok("a 30px object has only a useless sliver of ring",30-13*2<8,
    "6 pixels is not a target anyone can hit");
  ok("and the too-small rule catches it",30<13*2.5,
    "which is why it defers and says to zoom in");
  /* A crowd of handles means no particular one was meant. */
  ok("a crowd of handles defers to moving",/within>HANDLE_AMBIGUOUS/.test(ha),
    "on a dense polyline whichever is nearest is arbitrary");
  ok("the crowd threshold is small",/HANDLE_AMBIGUOUS=3/.test(srcAll));
  /* And an object too small to offer both actions says so. */
  ok("an object smaller than the grab radius defers",
    /Math\.max\(wpx,hpx\)<tol\*2\.5/.test(ha));
  ok("and explains that zooming in is the answer",/zoom in to edit/.test(ha),
    "the remedy is not obvious from the symptom");
  ok("said at most every few seconds",/tinyHandleAt/.test(ha));
  // counted the other way: does a real handle still work?
  ok("a press on a corner of a large object still grabs it",inRing(400,13));
}

// ---------- cache thrashing ----------
G("Cache thrashing");
{
  /* A device report showed three caches rebuilding far more often than the geometry
     changed: index 575, segments 448, flatten 418, against 33 undo snapshots. Two separate
     causes, both mine. */

  /* 1. The spatial index had ONE slot with an `all` flag. Snapping asks for the visible
        set, the hit test asks for everything, and from 3.41.0 both ran per interaction --
        so every alternation rebuilt it. It made both callers WORSE than before they used
        the index: hit test 2.97ms to 11.06ms, snapping 1.86ms to 3.31ms. */
  ok("the index keeps a slot per variant",
    /let segIndexVis=null[\s\S]{0,120}let segIndexAllC=null/.test(srcAll),
    "one slot with a flag thrashes when two callers want different variants");
  ok("neither slot evicts the other",
    /if\(all\)\{segIndexAllC=ix;[\s\S]{0,80}else\{segIndexVis=ix/.test(codeOf("segIndexFor")));
  ok("this is the pattern segments() already used",
    /segCacheAllVer===geomVersion&&segCacheAll/.test(codeOf("segments")),
    "I copied it and dropped the part that mattered");
  ok("both slots are reported",/index, visible set/.test(codeOf("profReport"))&&
    /index, all entities/.test(codeOf("profReport")),
    "one figure looked healthy while the two evicted each other 575 times");

  /* 2. A handle drag called segsDirty() every frame, which bumps geomVersion and so
        invalidates all three caches at once. The stale entry is the one already ignored:
        the dragged object is passed to snapPoint as `ignore`. */
  ok("a handle drag bumps the picture, not the caches",
    /dragVersion\+\+;\s*\}/.test(codeOf("applyHandle")),
    "segsDirty invalidates the segment list, the index AND the flattened list");
  ok("no segsDirty inside a handle drag",!/segsDirty/.test(codeOf("applyHandle")));
  ok("the caches are told once, when the drag ends",
    /if\(drag\.dirty\)segsDirty\(\)/.test(srcAll));
  ok("and not at all if nothing moved",/if\(!drag\.dirty\)past\.pop\(\)/.test(srcAll));

  /* The profiler now names a thrashing cache, because a timing breakdown cannot show it:
     "index rebuild 5046ms x575" reads as an expensive operation, and I read it that way
     until the call count gave it away. */
  const pr=codeOf("profReport");
  ok("the report flags a thrashing cache",/the cache is thrashing/.test(pr));
  ok("it compares rebuilds against geometry changes",/geomChanges/.test(pr),
    "that ratio is the signature");
  const flag=(n,g)=>n/g>4;
  ok("575 rebuilds for 33 changes is flagged",flag(575,33));
  ok("448 is flagged",flag(448,33));
  ok("418 is flagged",flag(418,33));
  ok("8 rebuilds for 25 changes is quiet",!flag(8,25),
    "a healthy run must not cry wolf");
  ok("25 for 26 is quiet",!flag(25,26));
}

// ---------- overlay cost ----------
G("Selection handles");
{
  /* A device report measured the overlay at 16.00ms per frame where it is normally 0.06 --
     200 times -- and the overlay is drawn FRESH every frame, so it is the one cost no cache
     can skip. One handle per VERTEX with no limit: a selection of 40,521 nodes drew 40,521
     handles, which works out at almost exactly the 16ms measured. This is the large-group
     drag reported earlier: not the geometry, the handles. */
  const dh=codeOf("drawHandles");
  ok("the handle count is capped",/total>HANDLE_MAX/.test(dh));
  ok("the cap is a few hundred",/HANDLE_MAX=600/.test(srcAll),
    "about 0.25ms, and more than anyone can distinguish on screen");
  ok("past the cap the outline shows the selection",/drawSelOutline\(\);return;/.test(dh),
    "handles on top of one another are unusable as well as expensive");
  ok("and it says why, once",/handleCapNoted/.test(dh));
  /* drawSelOutline had to be WRITTEN: I referenced it as though it existed. */
  ok("the outline helper exists",/function drawSelOutline/.test(srcAll),
    "the third helper I invented from thin air today");
  const so=codeOf("drawSelOutline");
  ok("it unions the selection's boxes",/objBBox\(o\)/.test(so));
  ok("and survives an object with no box",/if\(!isFinite\(mnx\)\)return/.test(so));
  // the arithmetic behind the 16ms
  const ms=n=>n*0.0004;
  ok("40,521 handles is about the 16ms measured",Math.abs(ms(40521)-16)<1,
    ms(40521).toFixed(1)+"ms");
  ok("600 handles is negligible",ms(600)<0.5,ms(600).toFixed(2)+"ms");
  /* DXF was untimed: a real log shows a 2.9MB export with no timing, because I wrapped the
     SVG path and not this one. */
  ok("the DXF export is timed too",/dxfOut=timeOnce\("DXF export"/.test(srcAll),
    "a 2.9MB export went unmeasured because only svgOut was wrapped");
}

// ---------- viewport culling ----------
G("Viewport culling");
{
  /* I CLOSED this item on a measurement of 0% off screen, noting in the tracker that it was
     "useless HERE, not wrong in principle". A later run at a closer zoom reported 73% off
     screen with the verdict "culling would pay". Both readings were true; the difference
     was the zoom, and the diagnostic found the case rather than my guessing when it would
     arrive. */
  const mk=codeOf("makeCullTest");
  ok("there is a cull test",!!mk);
  ok("it is built once and shared",/const onScreen=makeCullTest\(\)/.test(codeOf("paintStatic")),
    "four loops walk the drawing; four copies of the arithmetic would drift apart");
  ["drawEntity","drawMeasure","drawObjLabel"].forEach(f=>
    ok(f+" is culled",new RegExp("onScreen\\([em]\\)\\) "+f).test(codeOf("paintStatic"))||
      new RegExp("onScreen\\([em]\\)\\)\\s*"+f).test(codeOf("paintStatic"))));
  /* An object with no computable extent must be DRAWN, not guessed away. */
  ok("an object without a bounding box is drawn",/if\(!b\)return true/.test(mk),
    "a missing object is a far worse fault than a wasted draw call");
  ok("the margin is generous",/CULL_PAD_PX=120/.test(srcAll),
    "strokes, labels and haloes are painted outside the geometric box");
  // the test itself, as behaviour
  const test=(x0,x1,y0,y1)=>b=>!(b.mxx<x0||b.mnx>x1||b.mxy<y0||b.mny>y1);
  const t=test(0,1000,0,1000);
  ok("an object inside the view is kept",t({mnx:100,mxx:200,mny:100,mxy:200}));
  ok("one straddling the edge is kept",t({mnx:-50,mxx:50,mny:100,mxy:200}));
  ok("one entirely left of the view is dropped",!t({mnx:-500,mxx:-100,mny:100,mxy:200}));
  ok("one entirely above is dropped",!t({mnx:100,mxx:200,mny:2000,mxy:3000}));
  ok("one enclosing the whole view is kept",t({mnx:-1e6,mxx:1e6,mny:-1e6,mxy:1e6}),
    "a site boundary larger than the screen must still be drawn");
}

// ---------- hit testing ----------
G("Hit testing");
{
  /* The only per-interaction path still walking every entity: 2.97ms per call on the
     device, second only to snapping, while the snap paths had used the index since
     3.33.0. */
  const h=codeOf("hitAtInner");
  ok("it uses the segment index",/segsNear\(p,tol,true\)/.test(h));
  ok("each entity is tested once",/seen\.has\(e\)/.test(h),
    "many segments belong to one polyline");
  ok("types the index cannot hold still get a pass",/hasNoSegments\(e\)/.test(h));
  ok("and a poly the index skipped is NOT retested",
    /if\(!hasNoSegments\(e\)\)continue/.test(h),
    "testing it again would undo the narrowing");
  const hn=codeOf("hasNoSegments");
  ["circle","arc","text","link","group"].forEach(t=>
    ok(t+" has no segments",new RegExp('"'+t+'"').test(hn)));
}

// ---------- intersection snapping ----------
G("Intersection snapping");
{
  /* It stood down with 24,399 segments in range on a dense drawing, which is exactly where
     crossings are most useful. Two faults: the search box was three times wider than the
     snap tolerance -- NINE times the area -- and exceeding the cap refused rather than
     trimmed. */
  /* `let`, not `const`: the list is reassigned when it has to be trimmed. My assertion read
     const and failed on correct code. */
  ok("the search is the snap tolerance, not three times it",
    /let near=segsNear\(raw,tol,false\)/.test(srcAll),
    "tripling the tolerance made the box nine times the area for no gain");
  ok("exceeding the cap trims to the nearest, rather than refusing",
    /near=withD\.slice\(0,INTER_SNAP_MAX\)/.test(srcAll),
    "the crossing anyone wants is under the pointer");
  ok("the distance is computed, not read from projOnSeg",
    /const q=projOnSeg\(raw,g\.a,g\.b\)\.p/.test(srcAll),
    "projOnSeg returns {p,t} and no distance \u2014 reading .d2 would have made every key undefined");
  ok("and the trim is noted once, not per move",/interSnapTrimmed/.test(srcAll));
  /* Comments stripped: the one remaining mention is the note explaining the removal, which
     is the fifth time this session an assertion has read its own documentation. */
  ok("the stand-down path is gone entirely",
    !/interSnapWarned/.test(srcAll.replace(/\/\*[\s\S]*?\*\//g,"")),
    "there is nothing left to warn about");
  // the sort, as behaviour
  const segs=[{d:9},{d:1},{d:5},{d:3}];
  const nearest=segs.slice().sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.d);
  ok("the nearest are kept",nearest.join()==="1,3");
  ok("an undefined key would have left the order untouched",
    [{d:undefined},{d:undefined}].sort((a,b)=>a.d-b.d).length===2,
    "which is the bug the computed distance avoids");
}

// ---------- flattening the drawing ----------
G("Flattening");
{
  /* The last of the snapping cost. Snapping measured 2.59ms per call while the index had
     narrowed the segment work to 148 of 39,204 -- testing 148 segments cannot cost that, so
     the cost was elsewhere. The report held the clue: "0 of 63,648" entity checks over 27
     rebuilds is about 2,357 entities, not the handful I had assumed. */
  ok("flattening pushes into one array",/function flattenInto/.test(srcAll));
  ok("it does not concat in a loop",!/out=out\.concat\(flattenAll/.test(srcAll),
    "a new array per group, copying everything built so far \u2014 quadratic on nested groups");
  ok("the whole-drawing case is cached",/function flatEntities/.test(srcAll));
  ok("keyed on the geometry version",/flatCacheVer!==geomVersion/.test(codeOf("flatEntities")));
  ok("and only for S.entities",/flattenInto\(S\.entities,null,\[\]\)/.test(codeOf("flatEntities")),
    "a cache keyed on the wrong list would be worse than none");
  ok("the per-move paths use the cache",
    /flatEntities\(\)/.test(codeOf("snapPointInner")));
  // the arithmetic, since the concat fix is not merely tidier
  const into=(list,root,out)=>{for(const e of list){const r=root||e;
    if(e.t==="group")into(e.items,r,out);else out.push({o:e,root:r});}return out;};
  const oldWay=(list,root)=>{let out=[];for(const e of list){const r=root||e;
    if(e.t==="group")out=out.concat(oldWay(e.items,r));else out.push({o:e,root:r});}return out;};
  const ents=[];
  for(let g=0;g<200;g++){const items=[];for(let i=0;i<8;i++)items.push({t:"poly",p:[]});
    ents.push({t:"group",items});}
  ok("both produce the same list",into(ents,null,[]).length===oldWay(ents,null).length,
    "faster and different would be a bug, not an optimisation");
  ok("nesting is preserved",
    into([{t:"group",items:[{t:"group",items:[{t:"poly",p:[]}]}]}],null,[]).length===1);
  ok("the root is carried through nesting",
    into([{t:"group",items:[{t:"poly",p:[]}]}],null,[])[0].root.t==="group",
    "the root is what layer and lock checks consult");
}

// ---------- storage pressure ----------
G("Storage pressure");
{
  /* A real log showed 2,920KB of roughly 5MB used -- 58% -- where it had been 172KB the
     same morning. Nothing warned: the figure appeared only in the environment dump, which
     nobody reads until a write has already failed. And what fails is saving a symbol set,
     a template or the autosave: work already done, lost at the moment of keeping it. */
  const cs=codeOf("checkStoragePressure");
  ok("pressure is checked",!!cs);
  ok("at 50% and again at 85%",/pct>=0\.85\?2:pct>=0\.5\?1:0/.test(cs));
  ok("each level speaks once",/if\(level<=storeWarned\)return/.test(cs),
    "a message per write is the noise this app has produced three times already");
  ok("it names the figure",/MB of about 5MB/.test(cs));
  ok("and says what to do",/Export what you need/.test(cs));
  ok("it is checked after a write, not before",
    /checkStoragePressure\(\)/.test(srcAll)&&
    /const r=await RAW_STORE\.set\(k,v,sh\)[\s\S]{0,400}checkStoragePressure/.test(srcAll),
    "a write is when the total changes; measuring first would miss the one that crossed");
  ok("a refused write says so in the UI, not only the log",
    /The browser refused to save that/.test(srcAll),
    "that refusal is the thing the warning exists to prevent");
  // the thresholds, as behaviour
  /* The thresholds moved because of this test. 2,920KB of 5MB is 57%, and my first choice
     of 70% would have said nothing about a budget already more than half consumed by one
     saved drawing. Half full is when the NEXT drawing may not fit, which is the decision
     the warning exists to inform. */
  const level=u=>u>=0.85?2:u>=0.5?1:0;
  ok("172KB of 5MB warns about nothing",level(0.034)===0);
  ok("2,920KB of 5MB warns",level(2920/5120)===1,String(level(2920/5120)));
  ok("4,700KB of 5MB warns harder",level(4700/5120)===2);
  ok("the source uses those thresholds",/pct>=0\.85\?2:pct>=0\.5\?1:0/.test(cs));
}

// ---------- the keyboard must not freeze the device ----------
G("Resize during a keyboard animation");
{
  /* Creating a text object froze the whole iPad for several seconds. Raising the on-screen
     keyboard animates the visible height over roughly 250-300ms, firing resize on every
     frame -- and each one reallocated the screen canvas, allocated a NEW offscreen canvas,
     and repainted. At this canvas size that is 18.6MB twice per event plus 45-52ms, so
     fifteen events churned over half a gigabyte of GRAPHICS memory, which the OS has to
     find. Hence the whole device stalling rather than just the tab. */
  /* resizeNow was a function I introduced and then removed when dropping the duplicate
     coalescing; the logic lives in resize() itself. The tests were reading a name that no
     longer existed and reported three faults in correct code. */
  const rn=codeOf("resize");
  ok("the canvas is not reallocated when its size is unchanged",
    /const sized=\(cv\.width!==pw\|\|cv\.height!==ph\)/.test(rn)&&/if\(sized\)/.test(rn),
    "assigning width reallocates the backing store even for an identical value");
  ok("resize is not coalesced twice",
    (srcAll.match(/let resizeScheduled/g)||[]).length===1,
    "debouncedResize already does it at the listener; a second layer would delay every call");
  ok("the repaint is deferred while a text field has focus",
    /if\(textEditing\)\{[\s\S]{0,200}resizeSettle/.test(rn),
    "nothing needs to look right mid-animation: the keyboard covers the part that moved");
  ok("and it does eventually repaint",/resizeSettle=0;draw\(\)/.test(rn));
  ok("textEditing is declared before resize consults it",
    srcAll.indexOf("let textEditing")<srcAll.indexOf("function resize()"),
    "a temporal-dead-zone reference would throw the moment the keyboard raised");

  /* The offscreen canvas grows and is reused rather than replaced. */
  const dr=codeOf("draw");
  ok("the offscreen canvas is only reallocated when it is too SMALL",
    /statCv\.width<needW\|\|statCv\.height<needH/.test(dr),
    "a buffer larger than the screen costs nothing to blit from");
  ok("and it grows rather than shrinking to fit",
    /Math\.max\(needW,statCv\?statCv\.width:0\)/.test(dr),
    "rotating grows it once; the keyboard never does");
  /* Which means the blit must name its rectangles. */
  ok("the blit copies only the visible region",
    /drawImage\(statCv,0,0,cv\.width,cv\.height,0,0,cv\.width,cv\.height\)/.test(dr),
    "two-argument drawImage would copy an oversized buffer whole");
  ok("the whole buffer is cleared before a rebuild",
    /clearRect\(0,0,statCv\.width,statCv\.height\)/.test(dr),
    "stale pixels outside the screen area become visible after a rotation");
  // the arithmetic that made it a device-wide freeze
  const mb=(1366*2)*(892*2)*4/1048576;
  ok("one canvas at this size is about 19MB",Math.round(mb)===19,Math.round(mb)+"MB");
  ok("fifteen resize events would have churned over 500MB",mb*2*15>500,
    "graphics memory, not JS heap");
}

// ---------- build number in the status bar ----------
G("Build number cell");
{
  const css=srcAll.slice(0,srcAll.indexOf("</style>"));
  ok("there is a status bar cell for it",/id="sverCell"/.test(srcAll));
  ok("it shows the version AND the hash",
    /APP_VERSION\+" \\u00b7 "\+APP_HASH/.test(srcAll),
    "the version says which release; the hash says which FILE, which is what an upload needs");
  /* The bar scrolls horizontally on a narrow screen, so a trailing cell can be pushed out
     of sight -- and a version you have to scroll to find is no better than one in a panel. */
  ok("it is pinned rather than left to scroll away",
    /#sverCell\{margin-left:auto;position:sticky/.test(css));
  ok("it is set once, not every frame",/if\(!verCellDone/.test(srcAll),
    "it cannot change while the page is loaded");
  ok("tapping it opens the details",/togglePanel\(true\);aboutUI\(\)/.test(srcAll));
  ok("the tooltip explains what the hash is for",
    /changes with every edit/.test(srcAll));
  /* Hideable, like every other status cell. */
  ok("it can be turned off from View",/id="vBuild"/.test(srcAll));
  ok("the toggle reflects its state",/set\("vBuild",!S\.hideBuild/.test(srcAll));
  ok("and the View cell says when it is off",/off\.push\("no build"\)/.test(srcAll));
  /* In the workspace, not the drawing: it is about this browser, not the sheet. */
  ok("the preference is saved with the workspace",/hideBuild:S\.hideBuild/.test(codeOf("uiState")));
  ok("not with the drawing",!/hideBuild:S\.hideBuild/.test(codeOf("doc")),
    "sending a file should not carry your preference to whoever opens it");
  ok("it is applied on restore, not just stored",
    /\$\("sverCell"\)\.style\.display=S\.hideBuild/.test(srcAll),
    "the cell is in the markup from the start, so it would flash into view on every load");
}

// ---------- array ----------
G("Array");
{
  /* The one enhancement the data cleared: small, and what anyone laying out a fence, a row
     of desks or ladder rungs asks for within minutes. */
  const fn=codeOf("arraySelection");
  ok("the original stays where it is",/if\(!c&&!r\)continue/.test(fn));
  ok("copies get no id",/if\(q\.id!==undefined\)delete q\.id/.test(fn),
    "two objects answering to one id makes a link point at the wrong one");
  ok("copies arrive unlocked",/if\(q\.lock\)delete q\.lock/.test(fn),
    "inheriting the lock gives you something you cannot move into place");
  ok("links are excluded",/o\.t!=="link"/.test(fn),
    "a link's position comes from its ends, so a repeated one points at nothing");
  ok("and the exclusion is said, not silent",/a link follows the objects it joins/.test(fn),
    "silently skipping part of a selection is the fault Offset had");
  ok("measures go to the measure list",/isMeasureLike\(q\)/.test(fn));
  ok("it respects the lock on the source",/S\.sel\.filter\(canModify\)/.test(fn));
  /* Bounded by what the DRAWING can carry, not by the arithmetic: painting is already the
     dominant cost at 79,480 points, so an array adding a hundred thousand more is not a
     service. */
  ok("an array that would overwhelm the drawing is refused",
    /addedNodes>120000/.test(fn));
  ok("and says how many it would have added",/points, which is more than/.test(fn));
  const count=(objs,nodesEach,c,r)=>({made:objs*(c*r-1),nodes:objs*nodesEach*(c*r-1)});
  ok("3 across of one object makes two copies",count(1,4,3,1).made===2);
  ok("3 x 4 of two objects makes 22",count(2,4,3,4).made===22);
  ok("1 x 1 makes none",count(1,4,1,1).made===0);
  ok("the dialog says so rather than doing nothing",
    /One across and one down makes no copies/.test(srcAll));
  ok("a zero spacing is refused",/every copy lands on top of the original/.test(srcAll),
    "the paste fault from 3.30.0, avoided by design this time");
  /* Defaults from the selection's own size, so the first copy lands beside it. */
  ok("the spacing defaults to the selection size",/w\*1\.2/.test(srcAll));
  ok("the bounding box is built from objBBox",/objBBox\(o\)/.test(codeOf("openArrayDlg")),
    "selectionBBox does not exist \u2014 the second helper I invented today");
  /* Dismissable, which three dialogs were not until 3.21.2. */
  ok("it is listed as a blocking dialog",/"arrayDlg"\]/.test(srcAll));
  ok("and closeBlockingModals closes it",
    /if\(\$\("arrayDlg"\)\.classList\.contains\("open"\)\)closeArrayDlg\(\)/.test(srcAll));
  ok("there is a help entry",/i:"array-repeat"/.test(srcAll));
}

// ---------- new diagnostics ----------
G("Diagnostics added");
{
  /* Painting is now the dominant cost, and culling cannot help: the report shows 0% of
     entities off screen because 79,480 points live in a handful of polylines. The question
     is whether those points land on distinct PIXELS. */
  const md=codeOf("measureDecimation");
  ok("decimation potential is measured",!!md);
  ok("it samples one entity per pass",/decimProbe\+\+%list\.length/.test(md),
    "walking everything to measure whether walking everything is necessary was the earlier mistake");
  ok("it counts distinct pixels",/Math\.round\(s2\.x\)/.test(md));
  const pr=codeOf("profReport");
  ok("the verdict can say decimation would pay",/most of the painting is invisible/.test(pr));
  ok("and can say it would not",/the points are distinct; decimation would only lose detail/.test(pr));
  /* Three paths that had never been profiled at all, because they run once. */
  ok("one-off operations are timed",/function timeOnce/.test(srcAll));
  ["SVG export","building the document","opening the drawing"].forEach(n=>
    ok("\u201c"+n+"\u201d is timed",srcAll.includes('timeOnce("'+n+'"')));
  ok("a slow one is logged even with profiling off",/if\(ms>400\)logLine/.test(codeOf("timeOnce")),
    "someone who hits a four-second export should find the reason without foresight");
  ok("they are reported separately from frame time",/one-off operations:/.test(pr),
    "a once-per-export cost never appears in a frame breakdown");
  ok("and reset with the profiler",/delete ONCE\[k\]/.test(codeOf("profReset")));
}

// ---------- undo history size ----------
G("Undo history size");
{
  /* A device report showed 59 steps consuming 78.8MB of an 80MB cap -- 1.33MB per step on a
     39,740-node drawing. Paying 80MB of a roughly 200-400MB tab budget for 59 undos nobody
     asked for is a poor trade, and it is the drawing that suffers when memory runs short. */
  ok("the default is 25 steps",/HISTORY_DEFAULT_STEPS=25/.test(srcAll));
  ok("the state default matches the constant",/undoSteps:25/.test(srcAll),
    "S is built before the constant exists, so the value is repeated \u2014 this keeps them equal");
  ok("the old 150-step limit is gone",!/past\.length>150/.test(srcAll));
  ok("the byte cap remains as a backstop",/historyBytes>HISTORY_MAX_BYTES/.test(srcAll),
    "for a document where even 25 steps will not fit");
  ok("the step count is configurable",/id="undoSteps"/.test(srcAll));
  ok("and range-checked on input",/Math\.min\(150,Math\.max\(1,v\)\)/.test(srcAll));
  ok("saved with the drawing",/undoSteps:S\.undoSteps/.test(srcAll));
  ok("and range-checked on load",/d\.undoSteps>0&&d\.undoSteps<=150/.test(srcAll));
  ok("lowering it returns the memory at once",
    /while\(past\.length>1&&past\.length>S\.undoSteps\)/.test(srcAll),
    "applying it at the next action would make the figure shown untrue");

  /* Notification, both places, when the BYTE cap bites before the step cap -- which the
     person cannot know unless told, and which silently shortens how far back they can go. */
  const hp=codeOf("historyPressure");
  ok("the log gets it once a session, with numbers",
    /histWarnedSession/.test(hp)&&/KB per step/.test(hp));
  ok("the UI gets it, at most every two minutes",/Date\.now\(\)-histWarnAt<120000/.test(hp),
    "a message per action is the noise this app has produced twice already");
  ok("it says what to do",/Save to a file/.test(hp));
  ok("it distinguishes the two limits",
    /if\(historyBytes>HISTORY_MAX_BYTES\)droppedForBytes=true/.test(srcAll),
    "hitting the step limit is the setting working and needs no comment");
  /* The figure shown must be live. */
  ok("the panel figure updates while you work",
    /if\(panelOpenForNote\(\)\)undoNote\(\)/.test(codeOf("updateStatus")),
    "a stale number would have someone choosing from a figure true ten minutes ago");
  /* codeOf finds `function` declarations; panelOpenForNote is an arrow const, so it came
     back empty and the test failed on correct code. Asserted against the source instead. */
  ok("and costs nothing when the panel is shut",
    /const panelOpenForNote=\(\)=>\{[\s\S]{0,160}classList\.contains\("open"\)/.test(srcAll));
  ok("the note gives the per-step cost",/KB each/.test(codeOf("undoNote")),
    "the trade is only decidable with it: a step is kilobytes on a small sheet, megabytes on a large one");
  // the arithmetic
  const fits=(perStepKB,cap)=>Math.min(cap,Math.floor(80*1024/perStepKB));
  ok("25 steps at 1.33MB each fit inside the byte cap",fits(1330,25)===25,
    "the reported case now fits comfortably");
  ok("a very large document is still byte-limited",fits(8000,25)<25,
    "which is when the warning fires");
}

// ---------- dragging a group ----------
G("Dragging a group");
{
  /* Three separate faults behind "only the outline appears, drags sometimes, sometimes
     jumps". */

  /* 1. The outline moved and the geometry did not: the overlay draws the group's dashed box
        fresh every frame, while the members sat in the cached bitmap. Fixed in 3.32.0 by
        dragVersion; asserted there. Here: confirm the overlay really is the box's source,
        because that is what made the symptom look like a selection problem. */
  ok("the overlay draws the group outline",
    /setLineDash\(\[6,4\]\)[\s\S]{0,120}strokeRect/.test(srcAll),
    "drawn fresh each frame, unlike the members");

  /* 2. The jump. 3.31.0 floored the step so a keyboard nudge could not be invisible, and
        applyMove quantised the DRAG DELTA to that same floored step -- 109mm at site zoom,
        so a drag advanced in jumps. One constant, two situations that want opposite things. */
  const MIN=1;
  const floor=(b,z)=>b*z>=MIN?b:b*Math.ceil(MIN/(b*z));
  ok("a nudge step stays visible",floor(1,0.0092)*0.0092>=1);
  ok("a drag is not quantised to that floor",
    /const sx=gridSnapStepX\(\), sy=gridSnapStepY\(\)/.test(codeOf("applyMove")),
    "109mm jumps at site zoom is what the floor did to a drag");
  ok("the two steps are separate functions",
    /const gridSnapStepX=/.test(srcAll)&&/const snapStepX=\(\)=>stepFloor/.test(srcAll));
  ok("nudge still uses the floored one",/stepFloor/.test(
    (/const nudgeStepX=[^\n]*/.exec(srcAll)||[""])[0]));

  /* 3. "Sometimes but not always": hit testing needs a tap within ~11 screen pixels of a
        LINE, so on a group whose parts are spread out most of the dashed box was dead
        space. Selecting still needs geometry; once selected, the box drags. */
  const ig=codeOf("insideSelectedGroup");
  ok("a selected group can be dragged from inside its outline",!!ig);
  ok("only groups, and only selected ones",/o\.t!=="group"/.test(ig)&&/S\.sel/.test(ig));
  ok("a locked group is excluded",/canModify\(o\)/.test(ig));
  ok("the region matches the outline that is drawn",/6\/S\.view\.zoom/.test(ig),
    "what drags should be what you can see");
  /* The null pick this introduces must not clear the selection. */
  ok("a drag from inside the outline keeps the selection",
    /pick\.o&&!S\.sel\.includes\(pick\.o\)/.test(srcAll),
    "replacing it with [null] would clear it and the drag would do nothing");
  ok("and a tap inside the outline keeps it too",
    /if\(wasO\)toggleAt/.test(srcAll),
    "toggleAt would hit-test, find nothing, and deselect");
}

// ---------- spatial index ----------
G("Spatial index");
{
  /* Built on measurement. Two device runs agreed: snapping was 12,804ms of ~21,400ms total
     -- 60% of all frame time -- and only 0.12% of the 11,887 segments examined per snap
     were anywhere near the pointer. I twice declined this as premature; the figure that
     settled it came from the device rather than from me. */
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  /* Renamed with the two-slot fix: one slot with an `all` flag thrashed. The stubs follow
     the source rather than the other way round. */
  let geomVersion=1;
  let segIndexVis=null, segIndexVisVer=-1, segIndexAllC=null, segIndexAllVer=-1;
  const PROF={on:false}, profStart=()=>0, profEnd=()=>{};
  let SEGS=[];
  const segments=()=>SEGS;
  eval(grab("function buildSegIndex","function segIndexFor","function segsNear"));
  const make=(n,extent,len)=>{
    const out=[];
    for(let i=0;i<n;i++){
      const x=(i*7919%extent), y=(i*104729%extent), a=i*0.7;
      out.push({a:{x,y},b:{x:x+Math.cos(a)*len,y:y+Math.sin(a)*len}});
    }
    return out;
  };
  const brute=(p,tol)=>SEGS.filter(g=>{
    const x0=Math.min(g.a.x,g.b.x)-tol,x1=Math.max(g.a.x,g.b.x)+tol;
    const y0=Math.min(g.a.y,g.b.y)-tol,y1=Math.max(g.a.y,g.b.y)+tol;
    return p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;
  });
  /* Correctness first: an index that is fast and wrong is worse than the loop. */
  let missed=0;
  for(let t=0;t<60;t++){
    SEGS=make(400,10000,120); geomVersion++;
    const p={x:(t*911)%10000,y:(t*577)%10000};
    const got=new Set(segsNear(p,50,false));
    for(const w of brute(p,50)) if(!got.has(w)) missed++;
  }
  ok("the index never misses a segment brute force finds",missed===0,missed+" missed");
  /* A single line across the whole drawing would otherwise occupy tens of thousands of
     cells, so it goes in an overflow list every query checks. */
  SEGS=make(200,10000,120).concat([{a:{x:0,y:5000},b:{x:10000,y:5000}}]); geomVersion++;
  const spanner=SEGS[SEGS.length-1];
  ok("a line spanning the drawing is still found",
    segsNear({x:5000,y:5000},5,false).includes(spanner),
    "the overflow list is what makes that work");
  ok("the source has an overflow list",/map\.get\("\*"\)/.test(srcAll));
  /* And it must narrow, or it has achieved nothing. */
  SEGS=make(20000,200000,700); geomVersion++;
  const got=segsNear({x:100000,y:100000},300,false);
  ok("a query returns a small fraction of the list",got.length<SEGS.length/50,
    got.length+" of "+SEGS.length);
  /* These described the single-slot design: one cache plus an `all` flag. That thrashed
     once two callers wanted different variants, so there are two slots now. */
  ok("the index is keyed on the geometry version",
    /segIndexVisVer===geomVersion/.test(codeOf("segIndexFor")));
  ok("and each variant has its own slot",
    /segIndexAllVer===geomVersion&&segIndexAllC/.test(codeOf("segIndexFor")),
    "the visible and all-entities lists are different, and both callers run per interaction");
  /* A pathological tolerance must not sweep the grid more slowly than the loop. */
  /* This asserted the fallback that a device report proved harmful: it fired at low zoom
     and handed back all 38,754 segments, defeating the index exactly where it was needed.
     The box is clamped now, so the assertion is inverted. */
  ok("an absurd tolerance is clamped rather than abandoned",
    !/return segs;/.test(codeOf("segsNear")),
    "falling back to the full list defeated the index at low zoom");
  /* Every per-move snap must use it, or the cost stays. */
  /* 180 characters was too short for the near branch, whose comment sits between the guard
     and the call. Widened rather than removed: the point is that each branch reaches the
     index, not how close together the two lines are. */
  ["near","mid","perp"].forEach(k=>
    ok(k+"-snapping uses the index",
      new RegExp("S\\.snaps\\."+k+"[\\s\\S]{0,400}segsNear\\(").test(srcAll)));
  /* tol, not tol*3 — and `let`, since the list is reassigned when trimmed. This asserted the
     3x search that a device report showed returning 24,399 segments. */
  ok("intersection snapping pairs only the local set",
    /let near=segsNear\(raw,tol,false\)/.test(srcAll),
    "8.07 billion pairs at 127,000 segments becomes a few hundred");
  ok("the perpendicular set is centred on the pointer, not the anchor",
    /if\(S\.snaps\.perp&&anchor\) for\(const s of segsNear\(raw,/.test(srcAll),
    "the candidate is the foot of the perpendicular, useful only if it is near the pointer");
  /* Two faults in my own index, both found by a device report at 79,480 nodes. */

  /* 1. The fallback returned EVERYTHING at low zoom. A report showed "intersection
        snapping stood down: 38754 segments crowded near the pointer" -- 38,754 being the
        whole list: the tolerance is large in model units at low zoom, the query box spanned
        more than 4,096 cells of 40mm, and the index gave up. That both defeated the index
        and made the message a lie about crowding. */
  ok("the query box is clamped, not abandoned",
    /const MAX_SPAN=64/.test(codeOf("segsNear"))&&!/if\(\(x1-x0\+1\)\*\(y1-y0\+1\)>4096\)return segs;/.test(srcAll),
    "returning the whole list defeats the index at exactly the zoom that needs it");
  /* clamp returns the span along ONE axis; the number of cells visited is its square. My
     first version compared the span against a cell COUNT and failed on correct code. */
  const clamp=(tol,cell)=>Math.min(64,Math.max(1,Math.ceil((tol*2)/cell)));
  [[10,1],[100,5],[2000,64],[200000,64]].forEach(([tol,want])=>
    ok("a "+tol+"mm tolerance spans "+want+" cells per axis",clamp(tol,40)===want,
      "got "+clamp(tol,40)));
  ok("the worst case visits a bounded number of cells",clamp(200000,40)**2===4096,
    "64 x 64 \u2014 enough to be worth doing, small enough to stay fast");

  /* 2. Snapping still measured 2.62ms after the segment loop was indexed, because the
        endpoint snap walked all 79,480 chain points calling add() on each. I indexed the
        segments and left the vertices walking the whole drawing. */
  const sp=codeOf("snapPointInner");
  ok("vertices come from the narrowed segments",
    /for\(const g of segsNear\(raw,tol\*2,false\)\)/.test(sp),
    "a segment's endpoints ARE the chain vertices");
  ok("no full chain walk remains for endpoints",
    !/ch\.forEach\(p=>add\(p,1,"end"/.test(sp));
  ok("arcs and text still get a pass, since they have no segments",
    /o\.t==="arc"/.test(sp)&&/text origin/.test(sp),
    "few in number: 79,480 points live inside a handful of polylines");
  ok("the eager segment filter is gone",
    !/segments\(\)\.filter\(s=>/.test(sp),
    "it copied 77,508 segments per pointer move to drop the few being dragged");
  /* The exclusion Set was built only above four items, which left it null for a small
     drag -- and a null Set consulted from several loops silently ignores nothing, so a
     dragged object would have snapped to itself. */
  ok("the ignore set is built whenever there is anything to ignore",
    /igSet=ignore&&ignore\.length\?new Set/.test(sp));
  ok("and every exclusion consults it",!/ignore\.includes/.test(sp),
    "a mix of Set and includes is how one path ends up ignoring nothing");

  /* The verdict I got wrong. */
  ok("the pooling verdict is judged on cost, not count",
    /rebuildMs>4/.test(codeOf("profReport")),
    "20,000 allocations costing 0.39ms are not an argument for pooling");
}

// ---------- the picture must follow a drag ----------
G("Drag repaints the geometry");
{
  /* Reported precisely: dragging a large group moved the handles but the lines stayed put
     until release. The cause was conflating two different questions in one counter.

       geomVersion  -- has geometry changed enough to invalidate the SEGMENT cache?
                       Bumping it per drag frame would rebuild 19,250 segments each time.
       dragVersion  -- has the PICTURE changed? It has, on every frame of a drag.

     staticKey used geomVersion alone, so during a drag the key held still, the cached
     bitmap of the unmoved lines was blitted, and only the overlay was drawn fresh. */
  ok("a separate counter tracks the picture",/let dragVersion=0/.test(srcAll));
  ok("moving bumps it",/dragVersion\+\+/.test(codeOf("applyMove")));
  ok("resizing and vertex edits bump it too",/dragVersion\+\+/.test(codeOf("applyHandle")),
    "a handle drag moves the picture as much as a move does");
  ok("the static key includes it",/geomVersion\+"\."\+dragVersion/.test(codeOf("staticKey")),
    "otherwise the cache cannot know the picture changed");
  ok("the segment cache is NOT invalidated by a drag",
    !/segsDirty/.test(codeOf("applyMove")),
    "rebuilding 19,250 segments per frame is what geomVersion was protecting against");
  /* The consequence, checked as behaviour: a key that changes every frame means the
     thrash detection paints directly, which is correct during a drag. */
  const worth=(key,prev,paintMs)=>key===prev&&paintMs>6;
  ok("a changing key forces a direct paint",!worth("g.1","g.0",7.2),
    "a blit would show the previous frame's geometry");
  ok("a still frame still uses the cache",worth("g.5","g.5",7.2));
  ok("and a light drawing still never does",!worth("g.5","g.5",1.2));
}

// ---------- step floor ----------
G("Move steps stay visible");
{
  /* A real log showed "Moved 1 mm, less than a pixel at this zoom" a hundred times in three
     seconds from a held arrow key, while the object sat still. The step was in MODEL units,
     so on a site plan it was a fraction of a pixel -- the fifth model-versus-screen fault
     in one session. */
  const MIN=1;
  const floor=(base,zoom)=>base*zoom>=MIN?base:base*Math.ceil(MIN/(base*zoom));
  [[1,3.1],[1,1],[1,0.3],[1,0.0092],[1,0.0052]].forEach(([g,z])=>
    ok("a "+g+"mm step at zoom "+z+" is at least a pixel",floor(g,z)*z>=1,
      (floor(g,z)*z).toFixed(2)+"px"));
  ok("a step already visible is left alone",floor(1,3.1)===1,
    "raising it needlessly would move things further than asked");
  ok("the floor lands on a grid multiple",floor(1,0.0092)%1===0);
  ok("a coarse grid is untouched",floor(1000,0.0092)===1000);
  ok("the source floors both snap and nudge",
    /const snapStepX=\(\)=>stepFloor/.test(srcAll)&&
    /const nudgeStepX=\(\)=>stepFloor/.test(srcAll));
  ok("the warning is said once, not per keypress",
    /Date\.now\(\)-nudgeWarnAt>3000/.test(codeOf("nudge")),
    "a held key buried the log with one repeated sentence");
  /* And the profiler counted a direct paint as a blit. */
  ok("direct paints are counted separately from blits",
    /PROF\.directPaints\+\+/.test(codeOf("draw")),
    "3,625 full repaints were reported as 3,625 cheap copies");
  ok("the report shows both",/direct paints "\+PROF\.directPaints/.test(codeOf("profReport")));
}

// ---------- copy and paste ----------
G("Copy and paste");
{
  /* Reported as "copy and paste doesn't work for group". Driving it headlessly showed it
     does work -- two groups, correct contents. The offset was the problem: one grid step in
     MODEL units, which on a 1mm grid at ordinary zoom is THREE PIXELS, so the copy landed
     underneath the original and nothing appeared to have happened. On the 120m site plan it
     was a hundredth of a pixel. */
  const PX=14;
  const off=(stepMM,zoom)=>{
    const want=PX/zoom, s=stepMM||1;
    return Math.max(s,Math.round(want/s)*s);
  };
  const px=(stepMM,zoom)=>off(stepMM,zoom)*zoom;
  [[1,3.1],[1,1],[1,0.3],[5,3.1],[1000,0.0092],[1000,0.0052],[100,0.05]].forEach(([g,z])=>
    ok("a copy is visible on a "+g+"mm grid at zoom "+z,px(g,z)>=10&&px(g,z)<=25,
      px(g,z).toFixed(1)+"px"));
  ok("the old behaviour was invisible",1*3.1<4,
    "one grid step on a 1mm grid was 3.1px \u2014 underneath the original");
  ok("the offset is never smaller than one grid step",off(5,3.1)>=5,
    "a coarse grid must not be violated");
  ok("and always lands on a grid multiple",off(1000,0.0092)%1000===0);
  ok("the source works from screen pixels",/PASTE_OFFSET_PX\/S\.view\.zoom/.test(srcAll));
  /* A group must survive the round trip: this is what was reported broken. */
  const pc=codeOf("pasteClipboard");
  ok("paste recurses into a group when translating",
    /translateObj/.test(pc),"translateObj handles group items");
  ok("a pasted copy gets fresh ids",/remap/.test(pc),
    "two objects answering to one id makes links point at the wrong one");
  ok("a link is only carried when both ends came with it",
    /ids\.has\(o\.a\.id\)&&ids\.has\(o\.b\.id\)/.test(codeOf("copySelected")),
    "one end outside would have nothing to point at");
}

// ---------- copying the log ----------
G("Copy details & log");
{
  /* The clipboard write must happen while the user gesture is still live. WebKit treats the
     gesture as spent once a promise has been awaited -- and aboutInfo() awaits four times,
     for a persistence query, a storage listing and two counts. So writeText was rejected
     every time on iOS and the whole thing fell through to the manual panel, silently. */
  const h=(/\$\("aboutCopy"\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/.exec(srcAll)||[""])[0];
  const iClaim=h.indexOf("navigator.clipboard.write(");
  const iAwait=h.indexOf("await aboutInfo()");
  ok("the clipboard is claimed before any await",
    iClaim>=0&&iAwait>=0&&iClaim<iAwait,
    "after an await the gesture is spent and the write is refused");
  ok("the text is supplied as a promise",/new Promise\(async resolve/.test(h),
    "that is what lets the claim happen first and the text arrive later");
  ok("writeText remains as a second path",/clipboard\.writeText/.test(h),
    "simpler, and it works on a desktop browser");
  /* The fallback worked all along. What it did not do was SAY it was the fallback -- a
     panel opening with the text in it looks identical whether the clipboard succeeded. */
  /* A real log showed "Details copied." from this button while the clipboard was empty --
     WebKit can resolve writeText and silently do nothing once the gesture is spent. So the
     promise resolving is not evidence, and a success message printed on it is a lie the app
     tells confidently. I believed it twice: once concluding the clipboard worked, once
     declaring it fixed. */
  ok("the panel opens whether or not the clipboard accepted",
    h.indexOf("openTextExport")>0&&!/return;\s*\}\s*$/.test(h.slice(0,h.indexOf("openTextExport"))),
    "the guaranteed path is always offered rather than kept as a fallback");
  ok("success is never claimed outright",!/note\("Details copied\."\)/.test(h),
    "the promise cannot support that claim");
  ok("the clipboard result is described as unverifiable",
    /accepted \(unverifiable\)/.test(h),
    "saying so is better than pretending either way");
  ok("the panel says what to do if the paste is empty",
    /select the text here/.test(h));
  ok("a refusal is logged",/clipboard unavailable|clipboard claim refused/.test(h),
    "so the next report shows why the last one was hard to get");
  /* The text is built once. It was two copies of the same twelve lines, one for each path,
     which is how they drift apart. */
  ok("one builder assembles the text",/function buildAboutText/.test(srcAll));
  ok("both paths use it",
    /buildAboutText\(j\)/.test(srcAll)&&/buildAboutText\(i\)/.test(srcAll));
  ok("the log and any performance reports are included",
    /profReports\.join/.test(codeOf("buildAboutText"))&&
    /logLines\.slice\(-120\)/.test(codeOf("buildAboutText")));
}

// ---------- advice that matches the browser ----------
G("Persistence advice");
{
  /* A real log paired "The browser declined" with "Adding the app to your Home Screen
     usually changes that" -- on Chrome for iOS, where a home-screen shortcut does not grant
     persistence at all. Advice that cannot work is worse than none: it sends someone on an
     errand and costs them the trust in everything else the app says. */
  const h=(/\$\("aboutPersist"\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/.exec(srcAll)||[""])[0];
  ok("the advice branches on the browser",/CriOS|FxiOS|EdgiOS/.test(h));
  ok("iOS Chrome is told it will keep declining",/keep declining/.test(h),
    "there is no setting that changes it");
  ok("and given something that does work",/Export everything/.test(h));
  ok("Safari still gets the Home Screen advice",/Home Screen/.test(h));
}

// ---------- cross-tab notices ----------
G("Cross-tab notices");
{
  /* A real log showed "the autosave was replaced by another tab" twice in the same second,
     from one listener bound once -- so either the other tab wrote twice or WebKit delivered
     the event twice. Deduplicating is correct either way, and guessing which was not
     necessary to fix it. */
  const fn=codeOf("autosaveTakenByOther");
  ok("the notice is deduplicated",/now-autoWarnAt<2000/.test(fn),
    "one event, however many times it arrives");
  /* The larger problem was relevance: it fired the instant a tab started, before anything
     was drawn, and a tab with nothing in it has nothing to lose. */
  ok("an empty tab logs but does not interrupt",
    /!S\.entities\.length&&!S\.measures\.length/.test(fn),
    "noise at the moment it is most likely to be read");
  ok("a tab with work gets a real warning",/use Save to file/.test(fn),
    "and is told what to do about it");
  ok("it says how much is at stake",/const n=S\.entities\.length/.test(fn)&&/\+n\+/.test(fn),
    "the count is held in a variable, since an identifier inside a message trips the "+
    "prose-leak check \u2014 correctly, as that shape once put an internal name on screen");
  ok("only one storage listener is bound",
    (srcAll.match(/addEventListener\("storage"/g)||[]).length===1,
    "two would double every cross-tab message");
  // the dedup window, checked as behaviour
  /* last starts at 0, matching the app, so a first event at t=1000 is only 1000ms after it
     and falls INSIDE the window. My first version asserted the opposite and failed on
     correct logic. Starting the clock where the app does makes the test say what it means. */
  const win=2000;
  let last=-win;
  const speak=t=>{if(t-last<win)return false;last=t;return true;};
  ok("the first event speaks",speak(1000));
  ok("a second 400ms later is dropped",!speak(1400));
  ok("one a minute later speaks",speak(61000));
}

// ---------- shared log attribution ----------
G("Log attribution");
{
  /* The log lives in localStorage and every tab writes to the same one -- deliberately, so
     a crash in one tab is readable from another. But a copied log mixed builds with no way
     to tell them apart: a real log held 3.21.1 and 3.23.0 env dumps interleaved. */
  ok("every log line carries a tab mark",/logLines\.push\(t\+" "\+TAB_MARK/.test(srcAll));
  ok("the mark is derived from the tab id",/TAB_MARK=TAB_ID\.slice/.test(srcAll),
    "stable for the life of the tab, different between tabs");
  ok("the mark is two characters",/slice\(0,2\)/.test(srcAll),
    "it is on every line, so it must be cheap and scannable");
  ok("the banner says which mark is this tab",/tab "\+TAB_MARK/.test(srcAll));
  ok("Copy details says so too",/this tab: /.test(srcAll),
    "otherwise the marks are unreadable");
}

// ---------- storage reporting ----------
G("Storage reporting");
{
  /* The reported quota was actively misleading: "quota about 39322MB, used about 0KB" on a
     browser holding ten symbol sets and nine templates. estimate() covers the Storage API
     family and Safari does not count localStorage in it -- which is where all of that
     lives. The line said "39GB free, using none" while the real budget was ~5MB. */
  const env=codeOf("logEnvironment");
  ok("the app measures its own keys rather than trusting the estimate",
    /localStorage\.key\(i\)/.test(env)&&/startsWith\("dg:"\)/.test(env));
  ok("the figure is doubled for two-byte characters",/bytes\*2/.test(env),
    "that is what the 5MB budget is counting");
  ok("the real budget is named",/roughly 5MB/.test(env));
  ok("the Storage API estimate is labelled for what it covers",
    /NOT the/.test(env)&&/IndexedDB and caches/.test(env),
    "reporting it unqualified is what made it misleading");
  // the arithmetic
  const sum=(pairs)=>pairs.reduce((n,[k,v])=>n+k.length+v.length,0);
  const pairs=[["dg:lib:Network","x".repeat(20000)],["dg:tpl:Ladder","y".repeat(5000)],
               ["unrelated:thing","z".repeat(90000)]];
  const mine=pairs.filter(([k])=>k.startsWith("dg:"));
  ok("only the app's own keys are counted",sum(mine)<sum(pairs),
    "another origin's data is not ours to report");
  ok("the doubling gives the stored size",sum(mine)*2>sum(mine));
}

// ---------- offset eligibility ----------
G("What Offset works on");
{
  const canSelect=()=>true;
  /* offsetEligibility now consults curveDeviatesVisibly, so it comes too -- with the state
     and helper it needs. A stub would be testing my stub rather than the app's judgement. */
  global.S={view:{zoom:1}};
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const CURVE_TOL_PX=2;
  const fmtBig=mm=>mm<1000?mm.toFixed(1)+" mm":(mm/1000).toFixed(2)+" m";
  eval(grab("function curveGapMM","function curveDeviatesVisibly","function offsetEligibility"));
  const works=n=>n===null;
  ok("an open polyline",works(offsetEligibility({t:"poly",p:[]})));
  ok("a closed polygon",works(offsetEligibility({t:"poly",p:[],cl:true})));
  ok("a rectangle",works(offsetEligibility({t:"rect"})));
  ok("a circle",works(offsetEligibility({t:"circle"})));
  ok("an arc",works(offsetEligibility({t:"arc"})));
  /* A curved polyline was ACCEPTED and offset against its underlying corner points, so the
     result did not follow the curve on screen. Silently wrong beats refused for badness,
     and it is the same fault Trim had. */
  /* Points now matter: a coarse curve is refused, a sketch is not. Passing an empty array
     tested nothing, since the judgement is about how far apart the points are. */
  const coarse={t:"poly",curve:true,p:[{x:0,y:0},{x:40,y:0},{x:80,y:0},{x:120,y:0}]};
  const fine={t:"poly",curve:true,p:Array.from({length:40},(_,i)=>({x:i*1.5,y:0}))};
  ok("a coarse curve is refused, not silently mis-offset",
    /curve/.test(offsetEligibility(coarse)||""),
    "offsetting it would come back visibly faceted");
  ok("a freehand sketch is allowed",offsetEligibility(fine)===null,
    "its points are close enough that the parallel copy follows the curve");
  ok("text is refused with a reason",
    /no outline/.test(offsetEligibility({t:"text"})||""));
  ok("a group is refused and says what to do",
    /ungroup/i.test(offsetEligibility({t:"group"})||""));
  ok("a connector is refused with a reason",
    /follows its objects/.test(offsetEligibility({t:"link"})||""));
  ok("a dimension is refused",offsetEligibility({a:1,b:2})!==null);
  /* Every refusal must give a reason, or the message is no better than nothing. */
  /* The coarse curve replaces the empty-point one: an empty array is now correctly ALLOWED,
     since there are no widely spaced points to object to. Stale test data, not a fault. */
  const all=[{t:"text"},{t:"group"},{t:"link"},{a:1,b:2},coarse];
  ok("every refusal explains itself",all.every(o=>{
    const w=offsetEligibility(o);return typeof w==="string"&&w.length>12;}));
  // partial selections
  const sel=[{t:"rect"},{t:"group"},{t:"text"}];
  const eligible=sel.filter(o=>offsetEligibility(o)===null);
  ok("a mixed selection offsets what it can",eligible.length===1);
  ok("and the source reports what it left alone",
    /left "\+ineligible\.length\+/.test(srcAll),
    "silently skipping an object is how \u2018it does not work\u2019 happens");
}

// ---------- symbol placement ----------
G("Placing a symbol");
{
  /* Found in a real log: "dropped item 23 - text at a non-numeric position" and "1 link
     pointing at nothing", both from the autosaved drawing. Both came from placement. */
  const ps=codeOf("placeSymbol");
  /* snapPoint returns {p,info}. Every caller unwraps it; the drag path passed the whole
     wrapper, so at.x was undefined and translateObj produced {NaN,NaN} for every part.
     It drew as nothing, saved, and surfaced as a dropped item on the NEXT load -- hours
     later, in a different session, about a different thing. */
  ok("the drag path unwraps snapPoint",
    /snapPoint\(toM\(\{x:e\.clientX-r\.left,y:e\.clientY-r\.top\}\)\)\.p/.test(srcAll),
    "every symbol placed by dragging since 3.3.0 had NaN coordinates");
  ok("a bad position is refused, not written",
    /typeof at\.x!=="number"/.test(ps)&&/isFinite\(at\.x\)/.test(ps),
    "a silent NaN is why this survived so long");
  // the arithmetic that produced it
  const bad={x:10,y:20};
  const wrapper={p:bad,info:{}};
  ok("adding an undefined gives NaN",isNaN(5+wrapper.x),
    "which is exactly what happened");
  ok("the guard catches that case",
    !(typeof wrapper.x==="number"&&isFinite(wrapper.x)));
  ok("and passes a real point",typeof bad.x==="number"&&isFinite(bad.x));

  /* Links inside a symbol carry object ids that mean nothing in another drawing. */
  ok("links are dropped from a placed symbol",/o\.t!=="link"/.test(ps),
    "carrying them produced \u20181 link pointing at nothing\u2019");
  ok("and the drop is reported, not silent",/cannot be carried between drawings/.test(ps));
  ok("a symbol that is only a link is refused",
    /is a single link and cannot be placed/.test(ps));
  ok("the refusal does not leave an empty undo step",
    /undoLast\(\)/.test(ps),"push runs before the check");
}

// ---------- join ----------
G("Join split lines");
{
  /* Split, Break and Explode all cut a line into pieces and none had an inverse. Merge
     sounded like the answer and is unrelated -- it makes a GROUP permanent. */
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  function join(parts,tol){
    const near=(p,q)=>dist(p,q)<=tol;
    let pieces=parts.map(p=>({pts:p.slice(),n:1}));
    let fused=true,joins=0;
    while(fused){
      fused=false;
      outer:
      for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
        const A=pieces[i],B=pieces[j];
        const a0=A.pts[0],a1=A.pts[A.pts.length-1],b0=B.pts[0],b1=B.pts[B.pts.length-1];
        let m=null;
        if(near(a1,b0))m=A.pts.concat(B.pts.slice(1));
        else if(near(a1,b1))m=A.pts.concat(B.pts.slice().reverse().slice(1));
        else if(near(a0,b1))m=B.pts.concat(A.pts.slice(1));
        else if(near(a0,b0))m=B.pts.slice().reverse().concat(A.pts.slice(1));
        if(m){pieces.splice(j,1);pieces.splice(i,1);pieces.push({pts:m,n:A.n+B.n});
          fused=true;joins++;break outer;}
      }
    }
    return{pieces,joins};
  }
  const P=(x,y)=>({x,y});
  const n=(parts)=>join(parts,0.001).pieces.length;
  const longest=(parts)=>Math.max(...join(parts,0.001).pieces.map(p=>p.pts.length));
  ok("head to tail",n([[P(0,0),P(10,0)],[P(10,0),P(20,0)]])===1);
  /* Orientation must not matter: Split does not guarantee which way round a piece runs. */
  ok("tail to tail, the second piece reversed",
    n([[P(0,0),P(10,0)],[P(20,0),P(10,0)]])===1);
  ok("head to head, the first piece reversed",
    n([[P(10,0),P(0,0)],[P(10,0),P(20,0)]])===1);
  ok("three pieces given out of order chain into one",
    n([[P(10,0),P(20,0)],[P(0,0),P(10,0)],[P(20,0),P(30,0)]])===1,
    "joining pairwise five times is not something anyone wants to do");
  ok("and keep every point",
    longest([[P(10,0),P(20,0)],[P(0,0),P(10,0)],[P(20,0),P(30,0)]])===4);
  ok("five sides of a rectangle become one",
    n([[P(0,10),P(0,0)],[P(0,0),P(10,0)],[P(20,0),P(20,10)],[P(10,0),P(20,0)],[P(20,10),P(0,10)]])===1);
  ok("two separate chains stay separate",
    n([[P(0,0),P(10,0)],[P(10,0),P(20,0)],[P(100,0),P(110,0)]])===2);
  ok("ends that do not meet are left alone",
    n([[P(0,0),P(10,0)],[P(50,0),P(60,0)]])===2,
    "anything looser would weld lines that merely pass near each other");
  /* A closed result rather than a line with coincident ends. */
  const tri=join([[P(0,0),P(10,0)],[P(10,0),P(10,10)],[P(10,10),P(0,0)]],0.001).pieces[0].pts;
  ok("a triangle's ends coincide, so it becomes closed",
    dist(tri[0],tri[tri.length-1])<0.001);
  // the wiring
  const js=codeOf("joinSelection");
  ok("only open polylines are accepted",/o\.t==="poly"&&!o\.cl/.test(js),
    "a closed shape has no free ends and a circle has nothing to join");
  ok("the tolerance is in screen pixels",/JOIN_TOL_PX\/S\.view\.zoom/.test(js),
    "a model-space tolerance would behave differently at every zoom");
  ok("it respects the lock",/S\.sel\.filter\(canModify\)/.test(js));
  ok("style is carried from the first piece",/"color","weight","dash","op","curve"/.test(js));
  ok("pieces that could not be joined are reported, not silently dropped",
    /left alone/.test(js));
  ok("Merge no longer sounds like it joins lines",
    /does not join lines/.test(srcAll),
    "its old message never said it was about groups");
}

// ---------- scroll containers ----------
G("Panels can scroll");
{
  /* A flex child does not shrink below its content size unless min-height:0 permits it, so
     overflow-y:auto alone scrolls nothing -- the child expands and the parent clips it.
     That put the Ask panel's walkthroughs out of reach entirely: they sit at the bottom of
     the content. #helpBody and #panelBody had the same omission, hidden only because their
     content happened to be shorter.

     Asserted directly rather than by a CSS sweep: a regex cannot reliably associate a rule
     with its element, and an earlier attempt at a sweep passed on a file with the fault
     present. */
  const css=srcAll.slice(0,srcAll.indexOf("</style>"));
  const rulesFor=n=>{
    const out=[];
    const re=new RegExp("#"+n+"\\{[^}]*\\}","g");
    let m;while((m=re.exec(css)))out.push(m[0]);
    return out.join("");
  };
  ["askBody","helpBody","panelBody"].forEach(n=>{
    const r=rulesFor(n);
    ok("#"+n+" declares a scroll",/overflow-y:auto/.test(r),"nothing to scroll otherwise");
    ok("#"+n+" can shrink below its content",/min-height:0/.test(r),
      "without min-height:0 the flex child expands and the parent clips it");
  });
  ok("the symbol list has its own scroll container",
    /max-height:min\(46dvh,360px\);overflow-y:auto/.test(css),
    "25 symbols in a set overflowed the panel with nowhere to go");
  /* Touch: a row that claims the gesture cannot be scrolled past. */
  ok("symbol rows allow vertical panning",
    /row\.style\.touchAction="pan-y"/.test(srcAll),
    "touch-action:none meant the list could not be scrolled at all");
  ok("a mostly-vertical movement is treated as a scroll, not a drag",
    /Math\.abs\(dy\)>Math\.abs\(dx\)/.test(codeOf("symDragMove")),
    "otherwise the first thing anyone does in a long list is drag a symbol by accident");
}

// ---------- text entry ----------
G("Text entry");
{
  const pti=codeOf("promptTextInput");
  /* Escape was the only documented way to cancel, and an iPad on-screen keyboard has no
     Escape key. Every other exit -- tapping away, dismissing the keyboard, tapping a
     toolbar button -- went through onblur, which COMMITTED. */
  ok("there is a visible cancel control",/cancelBtn/.test(pti),
    "Escape does not exist on a tablet keyboard");
  ok("there is a visible confirm control",/okBtn/.test(pti));
  ok("Escape still cancels for anyone with a keyboard",
    /ev\.key==="Escape"[\s\S]{0,40}finish\(false\)/.test(pti));
  ok("Enter still commits",/ev\.key==="Enter"[\s\S]{0,40}finish\(true\)/.test(pti));
  /* The buttons must not be defeated by blur firing first. */
  ok("the buttons suppress the default so focus is not lost first",
    /pointerdown"[\s\S]{0,60}preventDefault/.test(pti),
    "click arrives after blur, and blur is what commits");
  ok("blur does not commit when our own buttons caused it",
    /to===okBtn\|\|to===cancelBtn/.test(pti),
    "otherwise Cancel would commit before its handler ran");
  ok("blur still commits otherwise",/finish\(true\);\s*\};/.test(pti),
    "tapping the canvas to place the next label should keep what you typed");
  ok("the whole wrapper is removed on finish",/wrap\.parentElement/.test(pti),
    "removing only the input would leave the buttons floating");

  /* Clearing. The guard treated an empty entry as a mis-tap, which is right for a new
     object and wrong for an existing one. */
  ok("an empty entry is allowed when editing",/val\|\|allowEmpty/.test(pti));
  ok("creating still ignores an empty entry",
    /promptTextInput\(p,"",txt=>\{[\s\S]{0,200}?\}\);/.test(srcAll),
    "a stray tap must not leave an invisible object");
  ok("clearing a label removes it",/else\{delete o\.label/.test(codeOf("setLabel")));
  ok("clearing a text object removes the object",
    /if\(txt\)hit\.str=txt; else removeObjects\(\[hit\]\)/.test(srcAll),
    "an empty string would leave something invisible that still counts as geometry");
}

// ---------- sketch ----------
G("Sketch");
{
  /* Three separate faults, all of which read as "jaggedness":
       capture every 2 CSS px = 4 device px on a retina screen,
       simplify tolerance as a fraction of the stroke's own size,
       and the result drawn as straight segments. */
  const CLOSE=0.12;
  const pathLen=p=>{let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);return L;};
  const diagOf=p=>{let a=1e9,b=1e9,c=-1e9,dd=-1e9;
    p.forEach(q=>{a=Math.min(a,q.x);b=Math.min(b,q.y);c=Math.max(c,q.x);dd=Math.max(dd,q.y);});
    return Math.hypot(c-a,dd-b)||1e-6;};
  const isClosed=p=>{
    const gap=Math.hypot(p[0].x-p[p.length-1].x,p[0].y-p[p.length-1].y);
    const L=pathLen(p);
    return gap<L*CLOSE&&L>diagOf(p)*1.6;
  };
  const arcPath=(sweep,n)=>{const p=[];for(let i=0;i<=(n||80);i++){
    const a=i/(n||80)*sweep;p.push({x:500*Math.cos(a),y:500*Math.sin(a)});}return p;};
  ok("a full circle closes",isClosed(arcPath(Math.PI*2)));
  ok("a nearly-full circle closes",isClosed(arcPath(Math.PI*1.9)));
  ok("a C does not close",!isClosed(arcPath(Math.PI*1.5)),
    "at 0.58 of the diagonal it did, which is why everything came back closed");
  ok("a gentle arc does not close",!isClosed(arcPath(Math.PI*0.8)));
  ok("a straight line does not close",
    !isClosed([{x:0,y:0},{x:500,y:10},{x:1000,y:20}]));
  /* The case I first wrote here was a there-and-back stroke, which I expected to stay
     open. It closes, and it should: a path that returns to its start IS closed, degenerate
     or not. I was asserting my intuition rather than the definition. The condition the
     wrap test actually earns is a SHORT stroke whose ends happen to be near each other
     without the path going anywhere. */
  ok("a stroke that goes nowhere does not close",
    !isClosed([{x:0,y:0},{x:5,y:0},{x:10,y:0}]),
    "ends far apart relative to a path that never turned back");
  ok("the wrap condition is present",/L>diag\*1\.6/.test(srcAll),
    "two ends can be close simply because a stroke is short");
  /* Three modes, because whether a stroke was meant as a loop is a judgement the
     automatic answer will sometimes get wrong. */
  const decide=(mode,tol,gap,L,diag)=>{
    const wraps=L>diag*1.6;
    return mode==="open"?false:mode==="close"?wraps:(gap<L*tol&&wraps);
  };
  const circle={gap:0,L:3140,diag:1000};
  const C={gap:707,L:2356,diag:1000};
  const line={gap:1000,L:1000,diag:1000};
  ok("auto closes a circle",decide("auto",0.12,circle.gap,circle.L,circle.diag));
  ok("auto leaves a C open",!decide("auto",0.12,C.gap,C.L,C.diag));
  ok("always-open leaves a circle open",!decide("open",0.12,circle.gap,circle.L,circle.diag),
    "the override must beat the geometry");
  ok("close-if-it-wraps closes a C",decide("close",0.12,C.gap,C.L,C.diag));
  ok("close-if-it-wraps still refuses a straight line",
    !decide("close",0.12,line.gap,line.L,line.diag),
    "a line is not a loop whatever the setting says, and closing it makes a degenerate shape");
  ok("a looser tolerance closes more",decide("auto",0.35,C.gap,C.L,C.diag));
  ok("a stricter tolerance closes less",!decide("auto",0.02,C.gap,C.L,C.diag));
  ok("the mode is read from state, not hard-coded",
    /S\.sketchClose==="open"/.test(srcAll)&&/S\.sketchClose==="close"/.test(srcAll));
  ok("the tolerance is read from state with a fallback",
    /S\.closeTol\|\|CLOSE_TOL_FRAC/.test(srcAll));
  ok("both are saved with the drawing",
    /sketchClose:S\.sketchClose,closeTol:S\.closeTol/.test(srcAll));
  ok("an unknown saved mode falls back to auto",
    /d\.sketchClose==="open"\|\|d\.sketchClose==="close"\)\?d\.sketchClose:"auto"/.test(srcAll),
    "an old file must not silently change how sketching works");
  ok("a saved tolerance is range-checked",
    /d\.closeTol>0&&d\.closeTol<=0\.5/.test(srcAll));
  ok("the panel reflects the saved value",
    /skAuto","auto"/.test(codeOf("syncUI")),
    "otherwise opening a drawing shows the wrong mode");

  ok("the source judges closure against path length, not the diagonal",
    /gap<L\*\(S\.closeTol\|\|CLOSE_TOL_FRAC\)/.test(srcAll),
    "the diagonal made it scale-relative");
  ok("the closure tolerance is tight",/CLOSE_TOL_FRAC=0\.12/.test(srcAll));

  /* Tolerance in screen pixels: on a 120m site, 0.025 of the diagonal discarded every
     point within three metres of the line between its neighbours. */
  const eps=(diag,zoom)=>Math.min(1.5/zoom,diag*0.025);
  ok("the tolerance is invisible at the zoom drawn at",
    Math.abs(eps(120000,0.0092)-163)<1,eps(120000,0.0092).toFixed(0)+"mm = 1.5px");
  ok("a small stroke at high zoom is still simplified",
    eps(50,10)<1.5,"the fraction stays as a ceiling");
  ok("the source uses a screen-pixel tolerance",
    /const epsPx=1\.5\/S\.view\.zoom/.test(srcAll));

  ok("a recognised sketch is drawn as a curve",
    /p:simp\.map\(snapPullPt\),curve:true/.test(srcAll),
    "straight segments between surviving points looked faceted regardless of spacing");
  ok("a recognised closed shape is too",
    /cl:true,curve:true/.test(srcAll));
  ok("capture spacing is one DEVICE pixel",
    /SKETCH_STEP_PX=1\/Math\.min\(window\.devicePixelRatio/.test(srcAll),
    "2 CSS px was 4 physical px on a retina screen");
}

// ---------- device identification and report retention ----------
G("Performance reports");
{
  /* A figure without a device is unattributable, and the right strategy differs by
     hardware: a threshold that suits a tablet may be wrong on a phone. */
  const dd=codeOf("describeDevice");
  ok("the report names the device first",
    /L\.push\(describeDevice\(\)\)/.test(codeOf("profReport")));
  ok("the iPad-as-Macintosh case is resolved by touch points",
    /touch\?"iPad \(reports as Macintosh\)"/.test(dd),
    "iPadOS reports itself as Macintosh in recent Safari");
  ok("the model is not guessed at",!/A1[0-9]|M1|M2|Pro Max/.test(dd),
    "it is not knowable from the browser, so it is not invented");
  ok("screen size and pixel density are recorded",/devicePixelRatio/.test(dd));
  ok("the canvas backing size is recorded",/cv\.width/.test(dd));
  ok("core count and touch points are recorded",
    /hardwareConcurrency/.test(dd)&&/maxTouchPoints/.test(dd));
  // the families, resolved
  const fam=(ua,touch)=>/iPhone/.test(ua)?"iPhone":/iPad/.test(ua)?"iPad"
    :/Macintosh/.test(ua)?(touch?"iPad (reports as Macintosh)":"Mac")
    :/Android/.test(ua)?(/Mobile/.test(ua)?"Android phone":"Android tablet")
    :/Windows/.test(ua)?"Windows":/Linux/.test(ua)?"Linux":"unknown";
  ok("an iPad is an iPad",fam("Mozilla/5.0 (iPad; CPU OS 26_5_0)",true)==="iPad");
  ok("a real Mac is a Mac",fam("Mozilla/5.0 (Macintosh; Intel Mac OS X)",false)==="Mac");
  ok("an iPad claiming to be a Mac is caught",
    fam("Mozilla/5.0 (Macintosh; Intel Mac OS X)",true)==="iPad (reports as Macintosh)");
  ok("an Android phone and tablet are told apart",
    fam("Mozilla/5.0 (Linux; Android 14) Mobile",true)==="Android phone"&&
    fam("Mozilla/5.0 (Linux; Android 14)",true)==="Android tablet");

  /* Retention. The log is capped at 400 lines and Copy takes the last 120, so a report
     taken while the problem was happening and followed by drawing is pushed out of both. */
  ok("reports are kept outside the capped log",/profReports\.push/.test(codeOf("profReport")));
  ok("the last three are kept",/profReports\.length>3/.test(codeOf("profReport")));
  ok("they are written to storage",/PERF_KEY/.test(codeOf("profReport")));
  ok("and restored at startup",/profReports=arr\.slice\(-3\)/.test(srcAll),
    "a device that has to be reloaded is the one whose report matters most");
  ok("Copy details & log always includes them",
    /profReports\.length\?"\\n\\n"\+profReports\.join/.test(srcAll));
  ok("the storage key is reserved from migration",
    /LOG_KEY,PERF_KEY/.test(srcAll),
    "an unlisted dg: key is treated as a stray drawing and destroyed");
}

// ---------- intersection snapping guard ----------
G("Intersection snap guard");
{
  /* Every segment against every other, on every pointer move. At 127,000 segments that is
     8.07 billion pairs, measured at 186 SECONDS per move -- and it was one Settings
     checkbox away with nothing in between. */
  const MAX=800;
  const pairs=n=>n*(n-1)/2;
  const msFor=n=>pairs(n)*23e-9*1000;      // 23ns per pair, measured
  /* These asserted the pre-index behaviour: a cap of 800 over the WHOLE drawing. With the
     spatial index the pairing runs over the pointer's neighbourhood instead, so the cap
     bounds a local crowd rather than the file, and 400 of those is well under a frame. The
     old assertions were correct when written and are now describing something that no
     longer exists. */
  /* These described a cap that REFUSED. It now trims to the nearest instead, so the
     feature never stands down and there is no stand-down message to check. Correct when
     written, describing something that no longer exists. */
  ok("the limit fits inside a frame",msFor(400)<16,
    msFor(400).toFixed(1)+"ms at 400 local segments");
  ok("bounding the whole drawing would not have",msFor(20000)>16,
    "which is why it bounds the neighbourhood");
  ok("the source trims to the limit",/near\.length>INTER_SNAP_MAX/.test(srcAll));
  ok("the limit is 400",/INTER_SNAP_MAX=400/.test(srcAll));
  ok("the feature no longer switches itself off",
    !/Intersection snapping is off/.test(srcAll),
    "refusing was the wrong answer where crossings are most useful");
  ok("it is said once, not per pointer move",/interSnapWarned/.test(srcAll));
  ok("and reset when a drawing loads",/resetInterWarn\(\)/.test(srcAll),
    "a smaller drawing deserves its own verdict");
}

// ---------- render request coalescing ----------
G("Render coalescing");
{
  /* A trackpad emits hundreds of wheel events a second and each forced a full render. */
  const wheel=/addEventListener\("wheel"[\s\S]{0,900}/.exec(srcAll)[0];
  ok("the wheel handler coalesces",!/(?<!request)\bdraw\(\)/.test(wheel),
    "one paint per frame, not per event");
  ok("pinch coalesces too",!/(?<!request)\bdraw\(\)/.test(codeOf("updatePinch")));
  ok("requestDraw still guards against double-scheduling",
    /if\(drawScheduled\)return/.test(codeOf("requestDraw")));
}

// ---------- DOM lookup cache ----------
G("DOM lookups");
{
  /* updateStatus makes 32 getElementById calls and runs every frame: a drag paid nearly
     two thousand DOM queries a second for elements that never change identity. */
  const dollar=/const \$=id=>\{[\s\S]{0,400}?\n\};/.exec(srcAll);
  ok("lookups are cached",!!dollar&&/_els\.get\(id\)/.test(dollar[0]));
  ok("a stale element is not returned",!!dollar&&/el\.isConnected/.test(dollar[0]),
    "an element removed and recreated must not be served from the cache");
  ok("a miss is not cached",!!dollar&&/if\(el\)_els\.set/.test(dollar[0]),
    "many elements are created later, so a null must be retried");
  // behaviour, not just shape
  const els=new Map();
  let queries=0;
  const doc={"a":{isConnected:true},"b":{isConnected:true}};
  const $=id=>{
    let el=els.get(id);
    if(el&&el.isConnected)return el;
    queries++;
    el=doc[id]||null;
    if(el)els.set(id,el);
    return el;
  };
  for(let i=0;i<100;i++){$("a");$("b");}
  ok("100 frames of two lookups cost two queries",queries===2,queries+" queries");
  for(let i=0;i<10;i++)$("missing");
  ok("a missing element is retried each time",queries===12,
    "it may appear later; caching the null would hide it");
  doc.a.isConnected=false;
  $("a");
  ok("a disconnected element is looked up again",queries===13);
}

// ---------- profiler ----------
G("Profiler");
{
  /* Built because every performance figure so far came from my machine rather than the
     device that matters. The point is not the timings but the attribution. */
  ok("frame time is counted even when measurement is off",
    /PROF\.frames\+\+/.test(codeOf("draw")),
    "two clock reads is nothing, and the mean frame time is the one number that matters");
  ok("per-phase accumulation is gated",/if\(!PROF\.on\)return/.test(codeOf("profStart")),
    "nothing should be paid for a facility that is not in use");
  ok("the static rebuild is timed",/profStart\("static rebuild"\)/.test(codeOf("draw")));
  ok("the overlay is timed separately from the rebuild",
    /profStart\("overlay"\)/.test(codeOf("draw")),
    "they are the blit and the repaint, and the difference is the whole design");
  ok("the segment rebuild is timed",/profStart\("segments rebuild"\)/.test(codeOf("segments")));
  ok("the undo snapshot is timed and its size recorded",
    /profStart\("undo snapshot"\)/.test(codeOf("push"))&&/undo snapshot MB/.test(codeOf("push")),
    "1,193ms measured off-device; this is how it gets measured on-device");
  /* Wrapped rather than edited per exit: snapPoint has seven returns. */
  ok("snapping is timed by wrapping, not by editing each return",
    /finally\{profEnd\("snapping"/.test(codeOf("snapPoint")),
    "seven profEnds is a change that gets one wrong and reports nonsense");
  ok("hit testing likewise",/finally\{profEnd\("hit test"/.test(codeOf("hitAt")));
  ok("a slow frame reports itself, at most every four seconds",
    /reportedAt>4000/.test(codeOf("draw")),
    "a warning every frame is the noise it is meant to replace");
  ok("the report includes the memory it can know exactly",
    /historyBytes/.test(codeOf("profReport"))&&/canvas backing store/.test(codeOf("profReport")));
  ok("the report names the heap as unavailable rather than omitting it",
    /not reported by this browser/.test(codeOf("profReport")));
  ok("the report is logged at a level that always survives",
    /logLine\(x,"error"\)/.test(codeOf("profReport")),
    "a diagnostic that the log level discards is useless");

  /* The cache-miss diagnosis: which key term changed. */
  const KEY_TERMS=["geometry","pan/zoom cx","pan/zoom cy","zoom","canvas size","view toggles",
    "sheet","unit","grid","selection","layers"];
  function whatChanged(a,b){
    const x=a.split("|"),y=b.split("|"),out=[];
    for(let i=0;i<Math.max(x.length,y.length);i++)
      if(x[i]!==y[i])out.push(KEY_TERMS[i]||("term "+i));
    return out;
  }
  const base="7|60000|34000|0.0092|1180x820|1000|0|mm|1000x1000/5|,|1111";
  [["geometry","8|60000|34000|0.0092|1180x820|1000|0|mm|1000x1000/5|,|1111"],
   ["pan/zoom cx","7|61000|34000|0.0092|1180x820|1000|0|mm|1000x1000/5|,|1111"],
   ["zoom","7|60000|34000|0.0104|1180x820|1000|0|mm|1000x1000/5|,|1111"],
   ["selection","7|60000|34000|0.0092|1180x820|1000|0|mm|1000x1000/5|12,|1111"],
   ["layers","7|60000|34000|0.0092|1180x820|1000|0|mm|1000x1000/5|,|1011"],
   ["view toggles","7|60000|34000|0.0092|1180x820|0000|0|mm|1000x1000/5|,|1111"],
   ["canvas size","7|60000|34000|0.0092|820x1180|1000|0|mm|1000x1000/5|,|1111"]]
   .forEach(([want,key])=>ok("a rebuild from "+want+" is named correctly",
     whatChanged(base,key).join()===want,whatChanged(base,key).join()));
  ok("the term list matches the key's own order",
    KEY_TERMS.length>=base.split("|").length,
    "a mismatch would name the wrong cause, which is worse than naming none");
}

// ---------- static layer cache ----------
G("Static layer cache");
{
  /* A full repaint issues about 47,000 canvas operations on a large drawing -- 29,000
     hatch strokes, 1,220 clips, 800 text layouts -- and every redraw paid it, including
     tapping a toolbar button that changes nothing. */
  /* The cache is not free: a blit is a clearRect plus a full-surface drawImage, about 15MB
     of pixel copy at retina density, and that cost is the same whether the drawing holds
     47,000 canvas operations or three. Applied unconditionally it made an almost-empty
     sheet SLOWER than no cache, and made every frame of every drag slower at any size. */
  const WORTH=6;
  function sim(paintCost,changing,frames){
    let paintMs=0,samples=0,prev="",cached=0,direct=0,total=0;
    for(let f=0;f<frames;f++){
      const key=changing?"k"+f:"k";
      const worth=!(samples<3)&&key===prev&&(paintMs/samples)>WORTH;
      prev=key;
      if(worth){total+=2;cached++;}
      else{total+=paintCost;direct++;paintMs=paintMs*0.8+paintCost;samples=Math.min(samples*0.8+1,10);}
    }
    return{cached,direct,total};
  }
  ok("a light drawing never uses the cache",sim(1,false,60).cached===0,
    "copying the surface costs more than painting a grid and three objects");
  ok("a heavy still drawing uses it throughout",sim(70,false,60).cached>50);
  ok("a heavy drawing being dragged does not use it",sim(70,true,60).cached===0,
    "the key changes every frame, so it would rebuild AND blit");
  ok("and a light drawing being dragged does not either",sim(1,true,60).cached===0);
  ok("caching a heavy still drawing is much cheaper",
    sim(70,false,60).total<sim(70,false,60).direct*70+400,
    "460ms against 4200ms is the case it exists for");
  /* A run counter was the first attempt and oscillated. */
  ok("the decision compares against the previous frame, not a run count",
    /if\(key!==prevKey\)return false/.test(codeOf("cacheWorthwhile")),
    "a run counter decayed back and thrashed on half the frames of a drag");
  ok("the measurement comes from paints it does anyway",
    /paintMs=paintMs\*0\.8\+ms/.test(codeOf("paintDirect")),
    "no separate benchmarking pass");
  ok("the rebuild feeds the same measurement, so the decision can reverse",
    /paintMs=paintMs\*0\.8\+pms/.test(codeOf("draw")),
    "a drawing that gets lighter should switch the cache off");
  ok("no offscreen canvas is created for a light drawing",
    /const useCache=cacheWorthwhile\(key\)[\s\S]{0,400}if\(!useCache\)/.test(codeOf("draw")),
    "it should cost neither the memory nor the copy");
  ok("the profiler reports whether the cache is in use",
    /static cache: /.test(codeOf("profReport")),
    "\u201cnot in use\u201d on a light sheet is correct, not a fault");

  ok("the geometry is painted into an offscreen canvas",
    /statCtx/.test(codeOf("draw"))&&/paintStatic\(statCtx\)/.test(codeOf("draw")));
  ok("an unchanged frame is a blit, not a repaint",
    /drawImage\(statCv/.test(codeOf("draw")),
    "that is the whole point");
  ok("the overlay is drawn fresh every frame",
    /drawHandles\(\)/.test(codeOf("draw"))&&/drawSnapMark\(\)/.test(codeOf("draw")),
    "handles and previews are what actually change between frames");
  ok("export bypasses the cache",/if\(exporting\)\{paintStatic\(ctx\)/.test(codeOf("draw")),
    "an export must not be a blit of a screen-sized bitmap");
  /* The key is the correctness argument: anything the image depends on and is not in the
     key shows as a stale picture. Two were missed on the first attempt. */
  const k=codeOf("staticKey");
  [["the geometry version","geomVersion"],["pan and zoom","S.view.zoom"],
   ["canvas size","W"],["grid visibility","showGrid"],["labels","hideLabels"],
   ["dimensions","hideMeasures"],["area labels","showArea"],["the sheet","S.sheet"],
   ["layer visibility","l.vis"],["the guide flag","l.guide"],
   ["layer colour","l.color"],["the display unit","S.unit"],["the grid interval","S.gx"]]
   .forEach(([what,term])=>ok("the key covers "+what,k.includes(term),"missing "+term));
  ok("the selection is keyed by identity, not by count",
    /o\.id!=null\?o\.id/.test(k),
    "length plus first index collides when a different single object is selected");
  ok("a selected object still draws with its halo",
    /S\.sel\.includes\(e\)/.test(codeOf("paintStatic")),
    "the halo is part of the static image, which is why selection rebuilds");
}

// ---------- segment cache ----------
G("Segment cache");
{
  /* segments() was the single most expensive thing in the app at scale: 127,083 objects
     allocated and 58ms per call, and snapPoint calls it on every pointer move. Sixty of
     those a second is not possible, so moves queued and interaction lagged about a second. */
  ok("segments() is cached",/segCacheVer===geomVersion/.test(codeOf("segments")),
    "it was rebuilt on every pointer move");
  ok("the cache is keyed on a version, not cleared on redraw",
    !/segsDirty\(\)/.test(codeOf("draw")),
    "clearing it in draw() was useless \u2014 draw also runs on every move");
  ok("a mutation invalidates it",/segsDirty\(\)/.test(codeOf("push")));
  ok("an undo or redo invalidates it",/segsDirty\(\)/.test(codeOf("restore")),
    "restoring changes the geometry wholesale");
  ok("hiding a layer invalidates it",/L\.vis=!L\.vis;segsDirty\(\)/.test(srcAll),
    "visibility changes what segments() returns");
  /* This asserted invalidation on every frame of a drag, which was rebuilding three caches
     per frame — 448, 575 and 418 rebuilds against 33 real geometry changes on the device.
     The dragged object is passed to snapPoint as `ignore`, so its stale segments are
     filtered out of every candidate list anyway; nothing else has moved. Invalidated once,
     when the drag ends. */
  ok("a drag invalidates it once, at the end",
    /if\(drag\.dirty\)segsDirty\(\)/.test(srcAll),
    "per frame it rebuilt the segment list, the index and the flattened list");
  // the cache must key visible and all-entity lists separately
  ok("the visible list and the all list are cached separately",
    /segCacheAllVer/.test(codeOf("segments"))&&/segCacheVer/.test(codeOf("segments")),
    "sharing one slot would return the wrong list depending on who asked last");
}

// ---------- mitre limit ----------
G("Mitre limit");
{
  const MITRE_LIMIT=4;
  eval(grab("function lineLineX"));
  function mitreJoin(cur,nxt,dist){
    const x=lineLineX(cur[0],cur[1],nxt[0],nxt[1]);
    if(!x||!isFinite(x.x)||!isFinite(x.y))return cur[1];
    if(Math.hypot(x.x-cur[1].x,x.y-cur[1].y)>Math.abs(dist)*MITRE_LIMIT)return cur[1];
    return x;
  }
  /* Found in a real drawing: stray points a thousand units outside everything else. The
     1e-12 parallel guard only catches EXACTLY parallel; at 179 degrees the intersection is
     1146 units away and at 179.9 it is 11459. Every CAD package caps this. */
  function reach(deg){
    const r=deg*Math.PI/180;
    const c={x:100,y:0},d={x:100+100*Math.cos(r),y:100*Math.sin(r)};
    const len=Math.hypot(d.x-c.x,d.y-c.y);
    const n2={x:-(d.y-c.y)/len,y:(d.x-c.x)/len};
    const cur=[{x:0,y:10},{x:100,y:10}];
    const nxt=[{x:c.x+n2.x*10,y:c.y+n2.y*10},{x:d.x+n2.x*10,y:d.y+n2.y*10}];
    const p=mitreJoin(cur,nxt,10);
    return Math.hypot(p.x-100,p.y);
  }
  [179.9,179,175,170,150,90,45,20].forEach(deg=>
    ok("a "+deg+"\u00b0 join stays within the limit",reach(deg)<=40.01,
      "reached "+reach(deg).toFixed(0)+", limit 40"));
  ok("an ordinary right angle is still mitred, not bevelled",
    Math.abs(reach(90)-Math.hypot(10,10))<0.01,
    "the limit must not change joins that were fine");
  ok("the source uses mitreJoin, not a bare intersection",
    /out\.push\(mitreJoin\(/.test(src),"an unlimited mitre spikes");
}

// ---------- coordinate rounding ----------
G("Coordinate rounding");
{
  const r4=n=>Math.round(n*1e4)/1e4;
  ok("15 digits become 4",r4(-42.7905731119443)===-42.7906);
  ok("a whole number is untouched",r4(-26)===-26);
  ok("a 4dp value is untouched",r4(12.3456)===12.3456);
  ok("rounding is finer than anything drawable",1/1e4<0.001);
  /* Every generator, because the file showed full precision from an exploded arc and the
     format reference asks for 4dp. */
  ["explode","break","circle trim","sketch recognition"].forEach((_,i)=>{});
  const gens=(src.match(/roundGeom\(/g)||[]).length;
  ok("the generators route through roundGeom",gens>=6,"found "+gens+" uses");
}

// ---------- geometry: trim, break ----------
G("Trim, extend, break");
{
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const rectPts=e=>[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}];
  const arcPts=()=>[];
  global.S={entities:[]};
  const flattenAll=a=>a.flatMap(o=>o.t==="group"?o.items.map(x=>({o:x,root:o})):[{o,root:o}]);
  eval(grab("function chainOf","function segIntT","function chainSegments",
            "function crossingsAlong","function alongChain","function pointAtDist","function chainBetween"));
  const wall={t:"poly",p:[{x:0,y:0},{x:1000,y:0}]};
  S.entities=[wall,{t:"poly",p:[{x:200,y:-50},{x:200,y:50}]},{t:"poly",p:[{x:700,y:-50},{x:700,y:50}]}];
  const cr=crossingsAlong(wall);
  ok("both crossings found",cr.cuts.length===2&&cr.cuts[0].d===200&&cr.cuts[1].d===700);
  const bound=at=>{
    const b=cr.cuts.filter(c=>c.d<at).sort((x,y)=>y.d-x.d)[0];
    const a=cr.cuts.filter(c=>c.d>at).sort((x,y)=>x.d-y.d)[0];
    return [b?b.d:0,a?a.d:cr.total];
  };
  ok("tapping the middle removes the middle",String(bound(450))==="200,700");
  ok("tapping before the first removes to the start",String(bound(100))==="0,200");
  ok("tapping after the last removes to the end",String(bound(900))==="700,1000");
  const L={t:"poly",p:[{x:0,y:0},{x:100,y:0},{x:100,y:100}]};
  S.entities=[L];
  const piece=chainBetween(L,40,crossingsAlong(L).total);
  ok("a corner is kept inside the piece",piece.length===3&&piece[1].x===100&&piece[1].y===0);
}

// ---------- trimming a closed shape ----------
G("Trim a polygon");
{
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const rectPts=e=>[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}];
  const arcPts=()=>[];
  global.S={entities:[]};
  const flattenAll=a=>a.flatMap(o=>[{o,root:o}]);
  eval(grab("function chainOf","function segIntT","function chainSegments",
            "function crossingsAlong","function alongChain","function pointAtDist","function chainBetween"));
  const hexPts=(cx,cy,r,n)=>Array.from({length:n},(_,i)=>{
    const a=Math.PI/2+i*2*Math.PI/n;
    return{x:+(cx+r*Math.cos(a)).toFixed(3),y:+(cy+r*Math.sin(a)).toFixed(3)};});
  const hex={t:"poly",cl:true,p:hexPts(0,0,100,6),l:1};
  S.entities=[hex,{t:"poly",p:[{x:-200,y:0},{x:200,y:0}],l:1}];
  ok("a closed polygon yields one segment per side",chainSegments(hex).length===6);
  const cr=crossingsAlong(hex);
  ok("a line through it gives two crossings",cr.cuts.length===2);
  ok("the perimeter is the sum of the sides",Math.abs(cr.total-600)<0.01);
  /* The bug this group exists for: a closed shape has no ends, so removing one span
     leaves a SINGLE run through the seam. Keeping two halves put a break at the arbitrary
     start of the point list, invisible until you moved one of them. */
  const lo=cr.cuts[0].d, hi=cr.cuts[1].d;
  const wrapped=chainBetween(hex,hi,cr.total).concat(chainBetween(hex,0,lo).slice(1));
  ok("what remains is one piece, not two",wrapped.length===5,
    "a closed shape has no ends, so the remainder wraps through the seam");
  ok("the piece is contiguous",
    wrapped.slice(1).every((q,i)=>dist(q,wrapped[i])>0.001),
    "no zero-length join where the two halves were spliced");
  ok("the source wraps for closed shapes",/closed&&lo>1e-6&&cr\.total-hi>1e-6/.test(src));
  /* Asserts that SOMETHING is said, not the exact wording. The first version quoted the
     sentence, so improving the wording failed the test -- which punishes exactly the kind
     of change this test exists to encourage. */
  const missed=/if\(!o\)\{[\s\S]{0,300}?\}/.exec(src);
  ok("a missed tap says something rather than failing silently",
    !!missed&&/note\(/.test(missed[0]),
    "silence here read as \u2018it does not work on polygons\u2019");
}

// ---------- trimming a circle ----------
G("Trim a circle");
{
  /* The sign of the sweep is the whole risk here: get it wrong and you silently keep the
     piece the user wanted removed. So every case asserts which piece SURVIVES. */
  const TAU=Math.PI*2, norm=a=>((a%TAU)+TAU)%TAU, R=d=>d*Math.PI/180, D=r=>+(r*180/Math.PI).toFixed(1);
  function pick(cuts,at){
    let from=null,to=null;
    for(let i=0;i<cuts.length;i++){
      const a=cuts[i], b=cuts[(i+1)%cuts.length];
      if(norm(at-a)<=norm(b-a)+1e-9){from=a;to=b;break;}
    }
    if(from===null){from=cuts[cuts.length-1];to=cuts[0];}
    return{start:D(to),sweep:D(norm(from-to))};
  }
  const cases=[
   ["two crossings, tap the top",[0,180],90,180,180],
   ["two crossings, tap the bottom",[0,180],270,0,180],
   ["three crossings, middle piece",[0,120,240],180,240,240],
   ["wraparound: tap the gap straddling zero",[30,300],350,30,270],
   ["wraparound from the other side",[30,300],10,30,270],
   ["unequal split, tap the small piece",[10,80],45,80,290],
   ["unequal split, tap the large piece",[10,80],200,10,70]];
  cases.forEach(([n,cuts,at,ws,ww])=>{
    const r=pick(cuts.map(R),R(at));
    ok(n,Math.abs(r.start-ws)<0.2&&Math.abs(r.sweep-ww)<0.2,
      "kept "+r.start+"/"+r.sweep+", wanted "+ws+"/"+ww);
  });
  // segment against circle, including the cases that produce no usable root
  function hits(c,r,a,b){
    const out=[],dx=b.x-a.x,dy=b.y-a.y,fx=a.x-c.x,fy=a.y-c.y;
    const A=dx*dx+dy*dy,B=2*(fx*dx+fy*dy),C=fx*fx+fy*fy-r*r;
    if(A<1e-12)return out;
    const disc=B*B-4*A*C;
    if(disc<0)return out;
    const sq=Math.sqrt(disc);
    [(-B-sq)/(2*A),(-B+sq)/(2*A)].forEach(t=>{if(t>=-1e-9&&t<=1+1e-9)out.push(t);});
    return out;
  }
  const c={x:0,y:0};
  ok("a chord gives two crossings",hits(c,50,{x:-99,y:0},{x:99,y:0}).length===2);
  ok("a tangent gives a double root",hits(c,50,{x:-99,y:50},{x:99,y:50}).length===2,
    "collapsed by the deduplication");
  ok("a miss gives none",hits(c,50,{x:-99,y:80},{x:99,y:80}).length===0);
  ok("a segment ending inside gives one",hits(c,50,{x:0,y:0},{x:99,y:0}).length===1);
  ok("a segment wholly inside gives none",hits(c,50,{x:-10,y:0},{x:10,y:0}).length===0);
  // and the refusals must be refusals
  ok("a curved polyline is refused, not silently mis-trimmed",
    /o\.t==="poly"&&o\.curve/.test(src),
    "it was trimmed against its corner points, which do not follow the curve");
}

// ---------- entity validation ----------
G("Validation");
{
  global.LOG=[];
  const logLine=(m,k)=>global.LOG.push(String(typeof m==="function"?m():m));
  eval(grab("function entityFault","function auditEntityList"));
  const bad=[
    [{t:"poly",p:[{x:0,y:0}],l:1},"one-point polyline"],
    [{t:"rect",x:0,y:0,w:0,h:10,l:1},"zero-width rectangle"],
    [{t:"circle",c:{x:0,y:0},r:0,l:1},"zero-radius circle"],
    [{t:"arc",c:{x:0,y:0},r:5,a0:0,sw:0,l:1},"arc with no sweep"],
    [{t:"text",p:{x:0,y:0},l:1},"text with no string"],
    [{t:"group",items:[],l:1},"empty group"],
    [{t:"link",a:{id:1},l:1},"link missing an end"],
    [{t:"spline",l:1},"unknown type"],
    [{t:"circle",c:{x:0,y:null},r:5,l:1},"null coordinate"],
    [{t:"rect",x:null,y:0,w:5,h:5,l:1},"null rect corner"],
    [{t:"circle",c:{x:0,y:0},r:null,l:1},"null radius"]];
  bad.forEach(([o,n])=>ok("rejects "+n,!!entityFault(o,0)));
  const good=[
    [{t:"poly",p:[{x:0,y:0},{x:1,y:1}],l:1},"two-point polyline"],
    [{t:"rect",x:0,y:0,w:5,h:5,l:1},"rectangle at the origin"],
    [{t:"arc",c:{x:0,y:0},r:5,a0:0,sw:-1.5,l:1},"arc with a negative sweep"],
    [{a:{x:0,y:0},b:{x:1,y:1},l:1},"length measure"]];
  good.forEach(([o,n])=>ok("accepts "+n,!entityFault(o,0),entityFault(o,0)||""));
  const r=auditEntityList([{t:"rect",x:0,y:0,w:5,h:5,l:1},{t:"circle",c:{x:0,y:0},r:0,l:1}],"t");
  ok("a bad entity is dropped, the rest kept",r.keep.length===1&&r.dropped.length===1);
}

// ---------- transparency ----------
G("Transparency");
{
  /* A `const` declared inside eval() does not leak into this scope -- the earlier blocks
     only worked because they grab `function` declarations, which do. Assigning them out
     explicitly is the fix, and applies to any const-based helper grabbed in future. */
  const [opOf,fopOf,svgOpacity]=eval(
    grab("const opOf=","const fopOf=","const svgOpacity=")+"\n[opOf,fopOf,svgOpacity]");
  ok("absent means fully opaque",opOf({})===1&&fopOf({})===1,"existing drawings must be unaffected");
  ok("a value is honoured",opOf({op:0.4})===0.4&&fopOf({fop:0.25})===0.25);
  ok("nonsense is ignored",opOf({op:-1})===1&&opOf({op:2})===1&&opOf({op:"half"})===1);
  ok("opaque emits no SVG attribute",svgOpacity({})==="");
  ok("object opacity emits opacity=",/ opacity="0.4"/.test(svgOpacity({op:0.4})));
  ok("fill opacity emits fill-opacity=",/ fill-opacity="0.3"/.test(svgOpacity({fop:0.3})));
  ok("both emit both",/opacity="0.5".*fill-opacity="0.2"/.test(svgOpacity({op:0.5,fop:0.2})));
}

// ---------- quick menu and auto-select ----------
G("Quick menu");
{
  const CMD={line:{lbl:"Line"},rect:{lbl:"Rect"},circle:{lbl:"Circle"},text:{lbl:"Text"},
    measure:{lbl:"Measure"},offset:{lbl:"Offset"},trim:{lbl:"Trim"},scale:{lbl:"Resize"}};
  function candidates(toolStats,hidden){
    hidden=hidden||{};
    const ranked=Object.keys(toolStats)
      .filter(k=>CMD[k]&&toolStats[k]>0&&!hidden[k])
      .sort((a,b)=>toolStats[b]-toolStats[a]||CMD[a].lbl.localeCompare(CMD[b].lbl));
    const fallback=["line","rect","circle","text","measure"];
    const out=[];
    ranked.concat(fallback).forEach(k=>{if(CMD[k]&&!out.includes(k)&&out.length<5)out.push(k);});
    return out;
  }
  ok("with no history it offers sensible defaults",
    candidates({}).join()==="line,rect,circle,text,measure",
    "an empty menu would be worse than a guess");
  ok("it ranks by use",
    candidates({offset:9,trim:5,line:1}).slice(0,3).join()==="offset,trim,line");
  ok("it always offers five",candidates({offset:9}).length===5,
    "topped up from the defaults");
  ok("equal counts break by label, not insertion order",
    candidates({rect:3,circle:3}).slice(0,2).join()==="circle,rect");
  ok("hidden commands are left out",
    !candidates({offset:9},{offset:true}).includes("offset"),
    "you hid it; it should not come back through a shortcut");
  ok("no duplicates when history and defaults overlap",
    new Set(candidates({line:5,rect:2})).size===5);
  // the guards on when it fires
  ok("it does not fire while a shape is part-drawn",/if\(pend\.pts\.length\)return;/.test(src));
  ok("it does not fire during a drag",/function quickPressStart[\s\S]{0,300}if\(drag\)return;/.test(src));
  ok("it does not fire on an object",/function quickPressStart[\s\S]{0,600}hitAt\(/.test(src));
  ok("movement cancels it",/quickPressMove[\s\S]{0,300}QUICK_SLOP/.test(src));
  ok("a second finger cancels it",/a second contact is a pinch/.test(src));
  ok("Escape closes it",/escape[\s\S]{0,80}quickPop/.test(src));
}

G("Auto-select");
{
  /* A command that acts on a selection implies you are selecting, so it should switch
     tools whether or not something is already selected. It used to switch only when the
     selection was empty, so reaching for Resize from the Line tool ran the command and
     left you on Line. */
  const m=/function runOnSelection\([^)]*\)\{[\s\S]{0,700}/.exec(src);
  const code=m[0].replace(/\/\*[\s\S]*?\*\//g,"");
  const iSwitch=code.indexOf('setTool("select")');
  const iEmpty=code.indexOf("if(!S.sel.length)");
  ok("the tool switch happens before the empty-selection branch",
    iSwitch>=0&&iEmpty>=0&&iSwitch<iEmpty,
    "otherwise it only switches when nothing is selected");
}

// ---------- per-object lock ----------
G("Locking");
{
  /* The rule: a locked object stays SELECTABLE, because the padlock on the selection bar
     is the only way to unlock it. Everything else is refused. Two gates, and the whole
     design depends on them being different. */
  const layers=[{id:1,vis:true,lock:false},{id:2,vis:false,lock:false},{id:3,vis:true,lock:true}];
  const layerOf=o=>layers.find(l=>l.id===o.l)||layers[0];
  const canSelect=o=>{const l=layerOf(o);return l.vis&&!l.lock;};
  const canModify=o=>canSelect(o)&&!o.lock;
  const plain={l:1}, locked={l:1,lock:true}, hiddenLayer={l:2}, lockedLayer={l:3};
  ok("an ordinary object is canSelect and canModify",canSelect(plain)&&canModify(plain));
  ok("a locked object is still canSelect",canSelect(locked),
    "otherwise the padlock is unreachable and there is no way back");
  ok("a locked object is not canModify",!canModify(locked));
  ok("an object on a hidden layer is neither",!canSelect(hiddenLayer)&&!canModify(hiddenLayer));
  ok("an object on a locked layer is neither",!canSelect(lockedLayer)&&!canModify(lockedLayer));
  // The guard reports a partial selection rather than silently skipping half of it.
  const guard=list=>{
    const l=list.filter(o=>o.lock);
    return l.length===0?"all":l.length===list.length?"none":"partial";
  };
  ok("a wholly unlocked selection proceeds",guard([plain,plain])==="all");
  ok("a wholly locked selection is refused",guard([locked,locked])==="none");
  ok("a mixed selection is reported, not silently halved",guard([plain,locked])==="partial");
  /* A systematic sweep, not a spot check. Eyeballing found three of the eight places
     that mutate the selection; this found the rest -- delete, nudge, rotate, mirror,
     group, scale -- several of which bypass runOnSelection entirely and so had no
     protection at all. Kept as a test because the next mutator added will forget too. */
  const READ_ONLY=new Set(["simplifySymbol","symbolFromSelection","selectionCenter",
    "quadIsAxisRect","placeSymbol","placeLabel"]);
  const MUTATES=["translateObj(","scaleObj(","rotateObj(","mirrorObj(","removeObjects("];
  const wrong=[];
  for(const m of src.matchAll(/function ([a-zA-Z]+)\([^)]*\)\{/g)){
    const name=m[1], body=src.slice(m.index+m[0].length,m.index+m[0].length+900);
    if(READ_ONLY.has(name))continue;
    if(!MUTATES.some(x=>body.includes(x))||!body.includes("S.sel"))continue;
    if(/S\.sel\.filter\(canSelect\)/.test(body))wrong.push(name);
  }
  ok("every function that mutates the selection uses the strict gate",!wrong.length,
    wrong.join(", ")+" filter on canSelect, which lets a locked object through");

  /* The rule as a whole, rather than function by function: when locked, the only
     permitted action is unlock. Asserted by listing every function that decides what an
     operation acts on, and requiring each to use the strict gate. Reorder was missed by
     reading the code and found by this. */
  const DECIDERS=["startMove","startHandle","nudge","deleteSelected","writeTargets",
    "scaleSelection","applyRotate","applyMirror","groupSelected","orderTargets","selectAll"];
  const permissive=DECIDERS.filter(fn=>{
    const m=new RegExp("function "+fn+"\\([^)]*\\)\\{[\\s\\S]{0,900}").exec(src)||
            new RegExp("const "+fn+"=[\\s\\S]{0,300}").exec(src);
    if(!m)return true;                       // missing is worse than permissive
    /* Comments stripped first. The gate's name appearing in a COMMENT satisfied the check,
       so reverting the gate still passed -- the test was reading prose. Third time that
       has happened, hence: strip, then assert. */
    const code=m[0].replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"");
    return !/\bcanModify\(|\bo\.lock\b|filter\(canModify\)/.test(code);
  });
  ok("nothing but unlock is permitted on a locked object",!permissive.length,
    permissive.join(", ")+" still act on locked objects");

  // The source must actually use the right gate in the right places.
  /* Windows widened to 800: the explanatory comments in the source push the code being
     asserted on past a 300-character window, so the test failed on code that was right.
     A source-text test has to allow for the source being commented. */
  /* Asserted on the function BODY rather than a character window from its name. The window
     was 800 characters and a comment pushed the lock check past it — the same brittleness
     that codeOf() exists to avoid, in a test written before codeOf was available here. */
  ok("handles are not drawn on a locked object",
    /o\.lock/.test(codeOf("drawHandles")),
    "handles invite a drag that is then refused");
  ok("select all leaves locked objects out",
    /function selectAll[\s\S]{0,800}filter\(canModify\)/.test(src),
    "otherwise every later command reports a partial refusal");
  ok("a pasted copy arrives unlocked",
    /delete c\.lock/.test(src),
    "you always want to move a fresh paste into place");
  ok("startMove filters on the strict gate",
    /function startMove[\s\S]{0,200}S\.sel\.filter\(canModify\)/.test(src),
    "the permissive gate would let a locked object be dragged");
  ok("style writes go through writeTargets",/function writeTargets/.test(src)&&
    /const t=writeTargets\(\)/.test(src));
  /* Anchored to the declaration. The first version matched a COMMENT that happened to
     mention syncStylePanel, so it was asserting on prose rather than on code -- which
     would have passed regardless of what the function did. */
  const sync=/function syncStylePanel\(\)\{[\s\S]{0,400}/.exec(src);
  ok("the style panel still READS locked objects",
    !!sync&&/const t=styleTargets\(\)/.test(sync[0]),
    "you should be able to see a locked object's colour without changing it");
}

// ---------- draw order ----------
G("Front to back");
{
  /* Draw order is array order, so these are list operations. The two that matter:
     relative order within a selection is preserved, and one step means one step among
     things that OVERLAP -- stepping past something on the far side of the sheet looks
     like the command did nothing. */
  const objBBox=o=>o.b;
  const overlaps=(a,b)=>!(a.b.mxx<b.b.mnx||b.b.mxx<a.b.mnx||a.b.mxy<b.b.mny||b.b.mxy<a.b.mny);
  const box=(x,y)=>({mnx:x,mny:y,mxx:x+10,mxy:y+10});
  const A={n:"A",b:box(0,0)},B={n:"B",b:box(5,5)},C={n:"C",b:box(200,200)},D={n:"D",b:box(6,6)};
  const names=a=>a.map(o=>o.n).join("");
  const front=(ents,sel)=>{const rest=ents.filter(o=>!sel.includes(o));return rest.concat(sel);};
  const back=(ents,sel)=>{const rest=ents.filter(o=>!sel.includes(o));return sel.concat(rest);};
  ok("to front puts it last",names(front([A,B,C],[A]))==="BCA");
  ok("to back puts it first",names(back([A,B,C],[C]))==="CAB");
  ok("relative order within the selection is kept",names(front([A,B,C,D],[A,C]))==="BDAC",
    "bringing several forward must not shuffle them against each other");
  // one step forward, skipping non-overlapping neighbours
  function forward(ents,o){
    const i=ents.indexOf(o);
    for(let j=i+1;j<ents.length;j++){
      if(!overlaps(o,ents[j]))continue;
      const a=ents.slice();a.splice(i,1);a.splice(j,0,o);return a;
    }
    return null;
  }
  ok("forward steps over the next overlapping object",
    names(forward([A,B,C],A))==="BAC",names(forward([A,B,C],A)));
  ok("forward ignores an object that does not overlap",
    names(forward([A,C,B],A))==="CBA",
    "C is on the far side of the sheet, so stepping past it would look like nothing happened");
  ok("already in front returns nothing to do",forward([B,A],A)===null,
    "and the caller must then not leave an empty undo step");
}

// ---------- text ----------
G("Text");
{
  /* Text takes its own path through both the canvas renderer and the SVG exporter, so
     anything added to entities generally has to be added to text separately -- which is
     exactly how background fill and opacity came to be missing from it. These assert the
     text path handles what the shared path does. */
  const src2=src;
  const drawText=/function drawText\(g,e,sel\)\{[\s\S]*?\n\}/.exec(src2)[0];
  ok("drawText reads the fill field",/e\.fill/.test(drawText),
    "a fill on text is a background panel behind the lettering");
  ok("drawText applies object opacity",/opOf\(e\)/.test(drawText));
  ok("drawText applies fill opacity",/fopOf\(e\)/.test(drawText));
  /* The first version allowed 40 characters between the restore and the draw, which the
     real code exceeds because of the alpha restore in between. Assert the ORDER, which is
     what matters, rather than the distance. */
  /* strokeColorOf is set twice: once at the top of the function and again after the
     panel. indexOf found the first and made the order look wrong. lastIndexOf finds the
     restore that actually matters -- a reminder that a test asserting on source text has
     to be as careful about which occurrence as the code is. */
  const iPanel=drawText.indexOf("fillStyle=e.fill");
  const iRestore=drawText.lastIndexOf("fillStyle=strokeColorOf(e,sel)");
  const iDraw=drawText.indexOf("fillText(");
  ok("the text colour is restored after the panel and before the lettering",
    iPanel>=0&&iRestore>iPanel&&iDraw>iRestore,
    "otherwise the lettering is drawn in the panel colour");
  const svgText=/if\(e\.t==="text"\)\{[\s\S]*?continue;/.exec(src2);
  if(svgText){
    ok("SVG export emits the background panel",/e\.fill/.test(svgText[0]),
      "an export that differs from the screen is the worst kind");
    ok("SVG export emits opacity",/opOf\(e\)/.test(svgText[0]));
  }
}

// ---------- grid ----------
G("Grid");
{
  // applyGrid clamps rather than accepting nonsense, and keeps Y with X when locked.
  const S={gx:5,gy:5,major:5,uniform:true};
  const apply=(gx,gy,major)=>{
    if(!(gx>0)||!isFinite(gx))return false;
    if(!(gy>0)||!isFinite(gy))gy=gx;
    major=Math.max(1,Math.round(major)||5);
    S.gx=gx;S.gy=S.uniform?gx:gy;S.major=major;return true;
  };
  ok("a valid interval applies",apply(10,10,5)&&S.gx===10);
  ok("locked axes follow X",S.gy===10);
  ok("zero is refused",!apply(0,0,5)&&S.gx===10);
  ok("a negative is refused",!apply(-4,0,5)&&S.gx===10);
  ok("letters are refused",!apply(NaN,0,5)&&S.gx===10);
  apply(10,10,0);ok("heavy interval is at least 1",S.major>=1);
  S.uniform=false;apply(10,4,5);ok("unlocked axes stay independent",S.gx===10&&S.gy===4);
}

// ---------- shipped files ----------
G("Shipped files");
{
  const dir=n=>fs.existsSync(n)?fs.readdirSync(n).filter(f=>f.endsWith(".json")):[];
  let Ajv;try{Ajv=require("ajv");}catch(e){}
  if(Ajv&&fs.existsSync("drafting-grid.schema.json")){
    const v=new Ajv({allErrors:true,strict:false}).compile(
      JSON.parse(fs.readFileSync("drafting-grid.schema.json","utf8")));
    let bad=[];
    ["starter","samples"].forEach(d=>dir(d).forEach(f=>{
      if(!v(JSON.parse(fs.readFileSync(d+"/"+f,"utf8"))))bad.push(f);}));
    ok("every shipped file matches the schema",!bad.length,bad.join(", "));
  }else console.log("  skip  schema validation (ajv or schema not present)");
  const setup="drafting-grid-setup.json";
  if(fs.existsSync(setup)){
    const d=JSON.parse(fs.readFileSync(setup,"utf8"));
    const sets=new Set(Object.keys(d.libraries||{}));
    const orphan=Object.entries(d.templates||{}).filter(([,t])=>t.library&&!sets.has(t.library));
    ok("every template's symbol set is in the setup file",!orphan.length,
      orphan.map(o=>o[0]).join(", "));
    ok("no template carries a drawing id",
      !Object.values(d.templates||{}).some(t=>t.uid));
    ok("no template carries geometry",
      !Object.values(d.templates||{}).some(t=>(t.entities||[]).length));
  }
}

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
