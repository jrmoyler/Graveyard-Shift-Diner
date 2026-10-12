'use strict';
const D=window.F033_DATA, byId=id=>document.getElementById(id);
const cache=new Map(), failures=[];
function load(path){if(!cache.has(path)){const im=new Image();cache.set(path,im);im.onerror=()=>failures.push(path);im.src='../'+path;}return cache.get(path);}
function draw(ctx,path,x,y,w,h){const im=load(path);if(im.complete&&im.naturalWidth)ctx.drawImage(im,x,y,w,h);}
let tab='stage',playing=true;
document.querySelectorAll('[role=tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;document.querySelectorAll('[role=tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===tab));}));
for(const id of ['stage-action','clip'])for(const key of Object.keys(D.clips)){const o=document.createElement('option');o.value=key;o.textContent=key;byId(id).append(o);}
byId('play-toggle').onclick=()=>{playing=!playing;byId('play-toggle').textContent=playing?'Pause animation':'Play animation';};
function playAudio(id){const item=D.audio.find(x=>x.id===id);if(item){const a=new Audio('../'+item.ogg);a.volume=.6;a.play().catch(()=>{byId('evidence-caption').textContent='Audio playback was blocked; use the Audio tab controls.';});}}
byId('serve-demo').onclick=()=>{playAudio('sfx-plate-set');byId('evidence-caption').textContent='Serve preview: plate-set cue.';};
byId('refuse-demo').onclick=()=>{playAudio('sfx-refuse-door');byId('evidence-caption').textContent='Refuse preview: restrained door-close cue.';};
function card(title,path,container){const c=document.createElement('article');c.className='card';const h=document.createElement('h3');h.textContent=title;c.append(h);if(path){const im=document.createElement('img');im.loading='lazy';im.src='../'+path;im.alt=title;c.append(im);}container.append(c);return c;}
for(const a of D.audio){const c=card(a.id,null,byId('audio-grid'));c.classList.add('audio-card');const p=document.createElement('p');p.textContent=a.caption+' · '+a.duration_seconds.toFixed(2)+'s'+(a.loop?' · loop':'');c.append(p);const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.loop=a.loop;audio.src='../'+a.ogg;c.append(audio);}
for(const c of D.creatures)card(c.name,'runtime/ui/guide/'+c.id+'.svg',byId('guide-grid'));
for(const r of D.regulars)card(r.id.replaceAll('-',' '),'runtime/ui/guide/regular-'+r.id+'.svg',byId('guide-grid'));
for(const path of D.ui){if(path.includes('/buttons/')&&!path.endsWith('-default.svg'))continue;card(path.split('/').pop().replace('.svg',''),path,byId('ui-grid'));}
byId('file-count').textContent=D.sprites.length+' registered sprite/frame/part files, '+D.ui.length+' UI assets and '+D.audio.length+' audio assets.';
for(const a of D.sprites){const c=card(a.id,a.path,byId('file-grid'));const p=document.createElement('p');p.className='tag';p.textContent=a.kind+' / '+a.width+'×'+a.height;c.append(p);const link=document.createElement('a');link.href='../'+a.path;link.textContent='Open PNG';c.append(link);}
const stage=byId('stage-canvas').getContext('2d'), ani=byId('animation-canvas').getContext('2d'), ins=byId('inspect-canvas').getContext('2d');
const ground=load('runtime/environment/diner-original.png');load('runtime/environment/diner-rear.png');load('runtime/effects/door-fog.png');
for(const id of ['earl','hollow-driver','under-sleeper','pale-hitcher'])load('runtime/characters/seated/'+id+'.png');
for(const p of ['coffee-cup','napkin-dispenser'])load('runtime/props/'+p+'.png');
for(const p of ['coffee-steam','cold-breath'])load('runtime/effects/'+p+'.png');
for(const p of ['hand-normal','hand-extra-knuckles'])load('runtime/tells/'+p+'.png');
for(const [id,clip] of Object.entries(D.clips))for(const f of new Set(clip.frames))load('runtime/animations/dot/'+id+'/'+String(f).padStart(2,'0')+'.png');
let time=0,last=0;
function clipPath(id,t){const c=D.clips[id];const idx=Math.floor(t*c.frameRate)%c.frames.length;return 'runtime/animations/dot/'+id+'/'+String(c.frames[idx]).padStart(2,'0')+'.png';}
function frame(ms){const delta=last?Math.min(.05,(ms-last)/1000):0;last=ms;if(playing&&!byId('reduced-motion').checked)time+=delta;
 if(tab==='stage'){stage.fillStyle='#0E1418';stage.fillRect(0,0,1280,720);if(ground.complete&&ground.naturalWidth)stage.drawImage(ground,0,110,1280,475);const action=byId('stage-action').value;draw(stage,clipPath(action,time),880,390,245,245);if(byId('show-fog').checked)draw(stage,'runtime/effects/door-fog.png',10,475,230,160);stage.fillStyle='#E8F5E1';stage.font='22px Plex';stage.fillText('NIGHT 01  /  11:00 PM',24,58);stage.fillText('Asset demonstration',930,58);}
 if(tab==='animation'){ani.fillStyle='#17242a';ani.fillRect(0,0,768,600);ani.strokeStyle='#7D8A8F';ani.beginPath();ani.moveTo(0,540);ani.lineTo(768,540);ani.stroke();const id=byId('clip').value,p=clipPath(id,time);if(byId('flip').checked){ani.save();ani.translate(768,0);ani.scale(-1,1);draw(ani,p,128,52,512,512);ani.restore();}else draw(ani,p,128,52,512,512);byId('animation-info').textContent=id+' · '+D.clips[id].frames.length+' playback frames · '+D.clips[id].frameRate+' fps · foot origin (0.5, 0.953125)';}
 if(tab==='inspect'){const id=byId('inspect-person').value;ins.fillStyle='#17242a';ins.fillRect(0,0,520,600);ins.save();ins.translate(240,455);ins.rotate((byId('offset').checked?8:0)*Math.PI/180);ins.fillStyle='#080c0f';ins.beginPath();ins.ellipse(0,0,110,26,0,0,Math.PI*2);ins.fill();ins.restore();draw(ins,'runtime/characters/seated/'+id+'.png',10,70,390,390);ins.fillStyle='#5B3A29';ins.fillRect(0,407,520,48);draw(ins,'runtime/props/coffee-cup.png',318,348,140,140);draw(ins,'runtime/props/napkin-dispenser.png',25,430,130,130);if(byId('reflect').checked){ins.save();ins.globalAlpha=.5;draw(ins,'runtime/characters/seated/'+id+'.png',61,456,60,60);ins.restore();}if(byId('steam').checked)draw(ins,'runtime/effects/coffee-steam.png',346,295,90,110);if(byId('breath').checked)draw(ins,'runtime/effects/cold-breath.png',231,180,140,100);draw(ins,'runtime/tells/'+(byId('extra').checked?'hand-extra-knuckles':'hand-normal')+'.png',205,430,175,155);}
 const pending=[...cache.values()].filter(im=>!im.complete).length;
 byId('status').textContent=failures.length?'Missing asset paths: '+failures.join(', '):pending?'Loading '+pending+' local asset sources…':'Local asset sources loaded. No network required.';
 requestAnimationFrame(frame);}
requestAnimationFrame(frame);
