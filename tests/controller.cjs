// DOM/controller integration only. Phaser rendering is stubbed, so these are
// not browser, canvas, GPU, touch-layout or screenshot tests.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'../dist');
const dependency=process.env.F033_DOM_TEST_MODULE;
if(!dependency){console.error('Set F033_DOM_TEST_MODULE to the installed linkedom package path.');process.exit(1);}
const {parseHTML}=require(dependency);
function shape(){const o={x:0,y:0,anims:{currentAnim:null,isPlaying:false,stop(){this.isPlaying=false;}}};
 for(const m of ['setOrigin','setDisplaySize','setDepth','setAlpha','setVisible','setRotation','setFlipX'])o[m]=function(...args){this[m+'Args']=args;return this;};
 o.play=function(key){o.anims.currentAnim={key};o.anims.isPlaying=true;return o;};o.destroy=()=>{o.destroyed=true;};o.setTexture=(key,frame)=>{o.texture={key};o.frame=frame;return o;};return o;}
async function session(Sim,saved=new Map()){
 const {window,document}=parseHTML(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'));let instance;
 class StubScene{
  constructor(){this.keys=new Set();this.load={on(){},image:(id,url)=>{assert(fs.existsSync(path.join(ROOT,url)),url);this.keys.add(id);},spritesheet:(id,url)=>{assert(fs.existsSync(path.join(ROOT,url)),url);this.keys.add(id);}};
   this.add={image:()=>shape(),sprite:()=>shape(),rectangle:()=>shape()};
   this.textures={get:()=>({getSourceImage:()=>({width:1672,height:620})}),createCanvas:id=>({context:{drawImage(){}},refresh(){}})};
   this.anims={create(){}};this.input={on(){}};this.time={now:0,delayedCall:(_,cb)=>cb()};this.tweens={killTweensOf(){},add:cfg=>cfg.onComplete?.()};
   this.cameras={main:{pan(){},zoomTo(){},shake(){}}};
  }
 }
 class StubGame{constructor(cfg){this.loop={wake(){},sleep(){}};this.scale={refresh(){}};instance=new cfg.scene[0]();instance.preload();setTimeout(()=>instance.create(),0);}}
 class StubAudio{constructor(){this._volume=1;}play(){return Promise.resolve();}pause(){}set volume(v){assert(Number.isFinite(v)&&v>=0&&v<=1);this._volume=v;}get volume(){return this._volume;}}
 Object.defineProperty(document,'hidden',{value:false,writable:true});
 const context=vm.createContext({...Sim,document,window:{matchMedia:()=>({matches:false}),addEventListener(){}},console,Audio:StubAudio,Phaser:{Scene:StubScene,Game:StubGame,CANVAS:1,Scale:{FIT:1,CENTER_BOTH:1}},
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},navigator:{},structuredClone,
  setTimeout,clearTimeout,requestAnimationFrame:cb=>setTimeout(()=>cb(0),0),location:{reload(){}},
  fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(ROOT,url),'utf8'))})});
 vm.runInContext(fs.readFileSync(path.join(ROOT,'app.js'),'utf8').replace(/^import[^\n]*\n/,''),context);
 for(let i=0;i<40&&!document.getElementById('boot').hidden;i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(document.getElementById('boot').hidden,true,'controller boot completed');
 let elapsed=0;
 const click=selector=>{const el=document.querySelector(selector);assert(el,'Missing '+selector);assert(!el.disabled,'Disabled '+selector);el.dispatchEvent(new window.Event('click',{bubbles:true}));};
 const advance=seconds=>{for(let i=0;i<Math.round(seconds*10);i++){elapsed+=100;instance.time.now=elapsed;instance.update(elapsed,100);}};
 return {document,window,click,advance,saved};
}
(async()=>{
 const Sim=await import(new URL('../dist/sim.js','file://'+__filename).href);
 const s=await session(Sim);
 s.click('#title [data-act="new-week"]');assert.equal(s.document.getElementById('game').hidden,false);
 s.click('#service [data-act="order"]');s.click('#service [data-act="cook"]');s.advance(8.1);
 assert(s.document.getElementById('burners').textContent.includes('Serve plate'));
 s.click('#burners [data-act="serve"]');s.advance(23);
 s.click('#table-list [data-id="102"]');
 s.click('#service [data-action="coffee"]');s.advance(3);
 assert(!s.document.getElementById('service').textContent.includes('Fresh coffee turns cold'));
 s.advance(1.1);assert(s.document.getElementById('service').textContent.includes('Fresh coffee turns cold'));
 s.click('#service [data-action="reflection"]');s.advance(4.1);
 assert(s.document.getElementById('service').textContent.includes('missing from the polished dispenser'));
 s.click('#service [data-act="refuse"]');assert(s.document.getElementById('toast').textContent.includes('justified'));
 s.click('#hud [data-act="pause"]');s.click('#overlay [data-act="save-menu"]');
 const checkpoint=JSON.parse(s.saved.get('f033-game-v1'));assert.equal(checkpoint.state.phase,'shift');assert.equal(checkpoint.progress.lanterns,3);
 const t=await session(Sim,s.saved);
 t.click('#title [data-act="settings"]');const volume=t.document.querySelector('#volume');volume.value='.2';volume.dispatchEvent(new t.window.Event('change',{bubbles:true}));
 assert.equal(JSON.parse(t.saved.get('f033-game-v1')).progress.cash,checkpoint.progress.cash,'settings preserves run');
 t.click('#overlay [data-act="close"]');t.click('#title [data-act="continue"]');
 assert.equal(t.document.getElementById('game').hidden,false);
 t.advance(600);assert(t.document.getElementById('overlay').textContent.includes('Shift receipt'));
 const escape=new t.window.Event('keydown',{bubbles:true});escape.key='Escape';t.document.body.dispatchEvent(escape);
 assert.equal(t.document.getElementById('overlay').hidden,false,'result cannot be dismissed into frozen play');
 t.click('#overlay [data-act="next"]');assert(t.document.getElementById('night').textContent.includes('NIGHT 2'));
 const report={status:'passed',scope:'DOM/controller integration with stubbed Phaser renderer',checks:['Boot and start menu','Take order, cook and serve through actual DOM buttons','Four-second evidence reveals','Two-clue refusal','Pause/save/menu checkpoint','Menu settings preserve save','Continue resumes gameplay','Receipt survives Escape','Next night starts'],browser_rendering_verified:false,physical_mobile_verified:false};
 fs.mkdirSync(path.join(ROOT,'verification'),{recursive:true});fs.writeFileSync(path.join(ROOT,'verification/controller.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
