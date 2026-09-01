/* Drives the app through the intent API, in a DOM, executing the real code paths. This is
   the check that was missing: live.js could click buttons, but it could not construct
   geometry and then inspect what the app actually stored. The NaN-coordinate bug lived in
   exactly that gap. */
const fs=require("fs");
const {JSDOM,VirtualConsole}=require("jsdom");
const {createCanvas}=require("canvas");
const file=process.argv[2]||"/mnt/user-data/outputs/repo/index.html";
const errors=[];
const vc=new VirtualConsole();
vc.on("jsdomError",e=>errors.push("jsdomError: "+((e&&e.message)||e)));
const dom=new JSDOM(fs.readFileSync(file,"utf8"),{
  virtualConsole:vc, runScripts:"dangerously", pretendToBeVisual:true,
  beforeParse(win){
    win.HTMLCanvasElement.prototype.getContext=function(){
      if(!this.__c)this.__c=createCanvas(Math.max(1,this.__w||1180),Math.max(1,this.__h||820));
      if(!this.__ctx){this.__ctx=this.__c.getContext("2d");
        const di=this.__ctx.drawImage.bind(this.__ctx);
        this.__ctx.drawImage=(i,...r)=>di(i&&i.__c?i.__c:i,...r);}
      return this.__ctx;};
    ["width","height"].forEach((k,i)=>Object.defineProperty(win.HTMLCanvasElement.prototype,k,{
      get(){return this["__"+k[0]]||(i?820:1180);},
      set(v){this["__"+k[0]]=v;if(this.__c)this.__c[k]=v;},configurable:true}));
    win.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},
      addEventListener(){},removeEventListener(){}});
    win.requestAnimationFrame=cb=>setTimeout(()=>{
      try{cb(Date.now());}catch(e){errors.push("in animation frame: "+((e&&e.message)||e));}},0);
    win.devicePixelRatio=2;
    win.addEventListener("error",e=>errors.push(e.message||String(e.error)));
  }
});
setTimeout(()=>{
  const api=dom.window.draftingGrid;
  let fail=0;
  const ok=(n,c,d)=>{if(c)console.log("  ok    "+n);else{fail++;console.log("  FAIL  "+n+(d?"  \u2014 "+d:""));}};
  console.log("DRIVING "+file.split("/").pop()+" THROUGH THE INTENT API\n");
  if(!api){console.log("  FAIL  the API is not exposed");process.exit(1);}
  ok("the API is exposed",!!api.intent);
  ok("it lists its ops",Array.isArray(api.ops())&&api.ops().length>=8,api.ops().join(", "));

  // geometry through the real code paths
  let r=api.intent({op:"line",p:[{x:0,y:0},{x:1000,y:0},{x:1000,y:800}]});
  ok("a line is created",r.ok,r.error);
  r=api.intent({op:"rect",at:{x:0,y:0},w:500,h:300,hatch:"brick",hs:50});
  ok("a hatched rectangle is created",r.ok,r.error);
  r=api.intent({op:"circle",at:{x:2000,y:0},r:250,fill:"#c9a227",fop:0.3});
  ok("a translucent circle is created",r.ok,r.error);
  r=api.intent({op:"text",at:{x:0,y:1200},str:"NOTE 1",size:100});
  ok("text is created",r.ok,r.error);

  /* The rules the UI learned the hard way. Each of these WROTE a corrupt object before. */
  ok("a NaN position is refused",
    !api.intent({op:"circle",at:{x:NaN,y:0},r:10}).ok,
    "this is the bug that survived nineteen releases");
  ok("a missing position is refused",!api.intent({op:"circle",r:10}).ok);
  ok("a wrapper object is refused",
    !api.intent({op:"circle",at:{p:{x:1,y:2}},r:10}).ok,
    "passing {p,info} instead of p was the actual mistake");
  ok("a zero radius is refused",!api.intent({op:"circle",at:{x:0,y:0},r:0}).ok);
  ok("a one-point line is refused",!api.intent({op:"line",p:[{x:0,y:0}]}).ok);
  ok("an unknown op is refused with the list",
    /Known:/.test(api.intent({op:"nonsense"}).error||""));

  // commands, through the same registry the toolbar uses
  api.intent({op:"select",all:true});
  r=api.intent({op:"command",name:"group"});
  ok("a command runs",r.ok,r.error);
  ok("an unknown command is refused",!api.intent({op:"command",name:"zzz"}).ok);

  // layers and units
  ok("a layer is created",api.intent({op:"layer",name:"Services",color:"#0e8a8a"}).ok);
  ok("an unknown unit is refused",!api.intent({op:"unit",unit:"furlongs"}).ok);
  ok("a known unit applies",api.intent({op:"unit",unit:"m"}).ok);

  // batch, and its all-or-nothing rule
  const before=api.intent({op:"inspect"}).objects;
  r=api.intents([{op:"line",p:[{x:0,y:0},{x:10,y:0}]},{op:"circle",at:{x:0,y:0},r:-5}]);
  ok("a batch stops at the first refusal",!r.ok,r.error);
  ok("and leaves nothing half-applied",api.intent({op:"inspect"}).objects===before,
    "half-applied geometry is worse than none");

  // and the document it produced must be sound
  const d=api.doc();
  ok("the document has the objects",d.entities.length>0,d.entities.length+" entities");
  const bad=JSON.stringify(d).includes("null,")||/NaN/.test(JSON.stringify(d));
  ok("no NaN or null coordinates anywhere",!bad);
  console.log("\n  runtime errors: "+errors.length);
  errors.slice(0,4).forEach(e=>console.log("     "+String(e).slice(0,120)));
  if(errors.length)fail++;
  console.log("\n"+(fail?fail+" failed":"all passed"));
  process.exit(fail?1:0);
},2500);
