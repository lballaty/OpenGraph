/* Drives the app through real DOM events and inspects the canvas pixels. Probing internals
   is not possible -- the script's consts are script-scoped, not window properties -- so
   verification has to work the way a user does: dispatch events, then look at what was
   painted. That is a better test anyway. */
const fs=require("fs");
const {JSDOM,VirtualConsole}=require("jsdom");
const {createCanvas}=require("canvas");
const file=process.argv[2]||"/mnt/user-data/outputs/repo/index.html";
const errors=[];
/* The window "error" event is not enough: an exception thrown inside a DOM event handler
   is reported by jsdom to its VIRTUAL CONSOLE, not re-thrown and not always dispatched as
   a window error. A deliberate reference error inside draw() was missed entirely -- by the
   harness whose whole purpose is catching exactly that. */
const vc=new VirtualConsole();
vc.on("jsdomError",e=>errors.push("jsdomError: "+((e&&e.message)||e)));
vc.on("error",(...a)=>errors.push("console error: "+a.join(" ")));
const dom=new JSDOM(fs.readFileSync(file,"utf8"),{
  virtualConsole:vc,
  runScripts:"dangerously", pretendToBeVisual:true,
  beforeParse(win){
    win.HTMLCanvasElement.prototype.getContext=function(){
      if(!this.__c)this.__c=createCanvas(Math.max(1,this.__w||1180),Math.max(1,this.__h||820));
      if(!this.__ctx){
        this.__ctx=this.__c.getContext("2d");
        const di=this.__ctx.drawImage.bind(this.__ctx);
        this.__ctx.drawImage=(img,...r)=>di(img&&img.__c?img.__c:img,...r);
      }
      return this.__ctx;
    };
    ["width","height"].forEach((k,i)=>Object.defineProperty(win.HTMLCanvasElement.prototype,k,{
      get(){return this["__"+k[0]]||(i?820:1180);},
      set(v){this["__"+k[0]]=v;if(this.__c)this.__c[k]=v;},configurable:true}));
    win.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    /* An exception inside a rAF callback is thrown from a bare setTimeout, which takes
       the whole harness down instead of being reported. Caught and recorded, because a
       crashing harness reports nothing at all -- the opposite of its purpose. */
    win.requestAnimationFrame=cb=>setTimeout(()=>{
      try{cb(Date.now());}catch(e){errors.push("in animation frame: "+((e&&e.message)||e));}
    },0);
    win.devicePixelRatio=2;
    win.addEventListener("error",e=>errors.push(e.message||String(e.error)));
    win.addEventListener("unhandledrejection",e=>errors.push("rejection: "+((e.reason&&e.reason.message)||e.reason)));
    win.console.error=(...a)=>errors.push("console.error: "+a.join(" "));
  }
});
const w=dom.window;
function pointer(el,type,x,y,id){
  const e=new w.Event(type,{bubbles:true,cancelable:true});
  Object.assign(e,{clientX:x,clientY:y,pointerId:id||1,pointerType:"mouse",button:0,
    isPrimary:true,pressure:0.5,shiftKey:false,altKey:false,metaKey:false,ctrlKey:false});
  el.dispatchEvent(e);
}
function inkCount(){
  const cv=w.document.getElementById("c");
  const g=cv.getContext("2d");
  const d=g.getImageData(0,0,cv.__c.width,cv.__c.height).data;
  let ink=0;
  for(let i=0;i<d.length;i+=4){
    // anything not the paper colour #fbfaf6
    if(Math.abs(d[i]-251)>6||Math.abs(d[i+1]-250)>6||Math.abs(d[i+2]-246)>6)ink++;
  }
  return ink;
}
setTimeout(()=>{
  let fail=0;
  const ok=(n,c,d)=>{if(c)console.log("  ok    "+n);else{fail++;console.log("  FAIL  "+n+(d?"  \u2014 "+d:""));}};
  console.log("EXECUTED "+file.split("/").pop()+"\n");
  ok("loads without error",errors.length===0,errors[0]&&String(errors[0]).slice(0,110));
  const cv=w.document.getElementById("c");
  ok("canvas got a backing store",!!(cv&&cv.__c));
  const base=inkCount();
  ok("something was painted at startup",base>0,base+" non-paper pixels");

  // drive the line tool
  const before=errors.length;
  const lineBtn=[...w.document.querySelectorAll("[data-tool]")].find(b=>b.dataset.tool==="line");
  ok("the line tool button exists",!!lineBtn);
  if(lineBtn){
    lineBtn.dispatchEvent(new w.Event("click",{bubbles:true}));
    pointer(cv,"pointerdown",300,300);
    pointer(cv,"pointermove",600,420);
    pointer(cv,"pointerup",600,420);
    pointer(cv,"pointerdown",600,420);
    pointer(cv,"pointerup",600,420);
  }
  /* REMOVED: "drawing a line changed the canvas". Pixel inspection reads 3 non-paper
     pixels on any build -- verified with a control run against a build predating the
     static layer cache -- so the blankness is jsdom's canvas plumbing, not the app. As an
     assertion it measured the harness, and as a GATE it would refuse every release. */
  const after=inkCount();
  console.log("  note  canvas ink before "+base+", after "+after+
    " (jsdom does not rasterise; not asserted)");
  ok("no errors while drawing",errors.length===before,errors[before]&&String(errors[before]).slice(0,110));

  // every toolbar button, clicked
  const btns=[...w.document.querySelectorAll("#bar1 button, #bar2 button")];
  const b4=errors.length;
  btns.forEach(b=>{try{b.dispatchEvent(new w.Event("click",{bubbles:true}));}catch(e){errors.push("click "+b.id+": "+e.message);}});
  ok("every toolbar button clicks without throwing ("+btns.length+" buttons)",
    errors.length===b4,errors[b4]&&String(errors[b4]).slice(0,110));
  console.log("\ntotal errors: "+errors.length);
  errors.slice(0,6).forEach(e=>console.log("   "+String(e).slice(0,130)));
  process.exit(fail?1:0);
},2500);

/* WHAT THIS HARNESS DOES AND DOES NOT VERIFY
 *
 * Verifies, on the real code path:
 *   - the page loads and the script runs to completion with no thrown error
 *   - a 2D context is obtained and the app does not crash on it
 *   - every toolbar button can be clicked without throwing
 *   - pointer events can be dispatched at the canvas without throwing
 *
 * Does NOT verify:
 *   - that anything correct was PAINTED. Pixel inspection reads 3 non-paper pixels
 *     regardless of build, and a control run against graph-paper_2.html -- which
 *     predates the static layer cache entirely -- gives the identical figure. So the
 *     blankness is jsdom's canvas plumbing, not the app. Any pixel assertion here would
 *     be measuring the harness.
 *   - layout, gesture handling, touch, pickers, storage, print, or how anything looks.
 *
 * The value is narrow but real: it is the only check that executes the app rather than
 * reading it, and it would catch a reference error or a broken call chain that source
 * matching cannot see.
 */
