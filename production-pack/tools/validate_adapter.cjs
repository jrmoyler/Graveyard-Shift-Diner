const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const source=fs.readFileSync(path.join(root,'runtime/integration/f033.js'),'utf8');
 const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const e=m.evidenceLayers(['no-reflection','cold-coffee']);assert.equal(e.reflectionVisible,false);assert.equal(e.coffeeSteamVisible,false);assert.equal(e.breathVisible,false);
 assert.equal(m.evidenceLayers(['shadow-offset']).shadowRadians,8*Math.PI/180);
 assert.equal(m.accessibilityEffects({flickerOff:true,grainOff:true}).flickerEnabled,false);assert.equal(m.accessibilityEffects({grainOff:true}).grainOpacity,0);
 const lines=JSON.parse(fs.readFileSync(path.join(root,'runtime/data/dialogue-180.json'),'utf8'));
 for(let i=0;i<180;i++){const out=m.fallbackLine(lines,{tells:['cold-coffee'],seed:i});assert(out.length<=120);assert(!out.includes('Hollow Driver'));}
 assert.equal(m.fallbackLine(lines,{tells:['echo-sentence'],previousSentence:'Where are you headed?'}),'Where are you headed?');
 const queued=[];const scene={load:{spritesheet:(key,url,opts)=>queued.push([url,opts]),image:(key,url)=>queued.push([url]),audio:(key,urls)=>urls.forEach(url=>queued.push([url])),json:(key,url)=>queued.push([url])}};
 m.preloadF033(scene);for(const [url] of queued)assert(fs.existsSync(path.join(root,url)),url);
 const created=[];m.createDotAnimations({anims:{exists:()=>false,create:config=>created.push(config)}});assert.equal(created.length,7);
 for(const c of created)assert(c.frames.every(f=>f.frame>=0&&f.frame<m.DOT_CLIPS[c.key.slice(4)].count));
 assert.equal(m.customerTransform('lingering',2000).scaleY,1);
 const result={status:'passed',checks:['Evidence layers independent','8-degree offset','Accessibility settings','180 fallback selections bounded and nonleaking','Exact echo fallback','All adapter preload paths exist','Seven valid animation registrations','Lingering still state'],full_phaser_run:false};
 fs.writeFileSync(path.join(root,'docs/ADAPTER-VALIDATION.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
