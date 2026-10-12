import {Diner,SEATS,SHIFT_SECONDS,DEFAULT_SETTINGS,normaliseSettings} from './sim.js';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+Number(n).toFixed(2), SAVE='f033-game-v1', SETTINGS='f033-settings-v1';
let model,content,engine,scene,overlay=null,guideTab='hollow-driver',sceneReady=false,renderClock=0,saveClock=0,lastUI='',toastTimer;
const displayNames={'earl':'Earl','vonda':'Vonda','pruitt-twins':'The Pruitt twins','coach-hale':'Coach Hale','ines':'Ines','ricky':'Ricky'};
const playerName=c=>c.regularId?displayNames[c.regularId]:'Traveler';
const recipe=c=>content.recipes.find(r=>r.id===c.recipeId);
const tableName=c=>c.seat===null?'At the door':c.seat<6?'Table '+(c.seat+1):'Counter '+(c.seat-5);
const tutorial=[
 'Earl is a familiar face. Take his order, then start cooking.',
 'Coffee takes 8 seconds. Select its ready burner to serve Earl.',
 "The next guest's coffee feels wrong. Open the field guide.",
 'Hollow Drivers show two tells. Check the next guest’s reflection.',
 'Two independent tells. Refuse service before the guest eats.',
 'You know the routine now. Keep the grill moving and trust evidence.'
];
const observations={
 'no-reflection':'The customer is missing from the polished dispenser.',
 'cold-coffee':'Fresh coffee turns cold instantly. No steam rises.',
 'knows-name':'The stranger knows Dot’s name without an introduction.',
 'wet-footprints':'The bootprints remain wet after the floor should have dried.',
 'echo-sentence':'The guest answers with your previous sentence.',
 'refuses-salt':'The guest refuses to touch the salt.',
 'extra-knuckles':'Five fingers—but an extra joint on the middle and ring fingers.',
 'shadow-offset':'The shadow points eight degrees away from the light.',
 'usual-first-visit':'A first-time guest orders “the usual.”',
 'drawn-to-neon':'The guest keeps turning toward the neon.',
 'sleeve-dust':'Fine wing-like dust coats the sleeves.',
 'never-blinks':'During the observation, the guest never blinks.',
 'duplicate-regular':'The guest matches a regular who was already seated.',
 'mirrored-hair':'The familiar hair part runs the opposite way.',
 'wrong-hand':'The guest uses the opposite hand from the familiar regular.',
 'no-car':'No vehicle is waiting for this guest outside.',
 'cold-breath':'The guest’s breath fogs in the warm diner.',
 'old-coins':'The payment coins are old and heavily worn.'
};
const upgrades=[
 ['mirror','Counter mirror',150,'Free reflection checks for the two counter seats.','mirror'],
 ['bell','Door bell',80,'A wrong-pitch chime when a Pale Hitcher arrives.','door-bell'],
 ['burners','Extra burners',200,'Four additional cooking slots.','burner-upgrade'],
 ['salt','Table salt',60,'A free salt observation for each arriving guest.','salt-pepper'],
 ['cook','Hired cook',250,'Cooking times reduced by 25%.','hired-cook-work']
];
class AudioDesk {
 constructor(){this.tracks={};this.active=[];}
 play(id){if(!model.settings.volume)return;const a=new Audio('assets/audio/'+id+'.ogg');a.volume=model.settings.volume*(id==='sfx-refuse-door'?.5:.65);a.play().catch(()=>{});this.active.push(a);a.onended=()=>{this.active=this.active.filter(x=>x!==a);};}
 start(){
  for(const id of ['music-jukebox','music-dread-drone','sfx-neon-buzz']){
   const a=this.tracks[id]||(this.tracks[id]=new Audio('assets/audio/'+id+'.ogg'));a.loop=true;a.play().catch(()=>{});
  }this.mix();
 }
 mix(){if(!model)return;for(const [id,a] of Object.entries(this.tracks)){
  a.volume=model.settings.volume*(id==='music-jukebox'?(model.settings.music?.38:0):id==='music-dread-drone'?.18*model.s.dread/100:.055);
  if(id==='music-jukebox')a.playbackRate=1-.05*(3-model.progress.lanterns);
 }}
 pause(){Object.values(this.tracks).forEach(a=>a.pause());this.active.forEach(a=>a.pause());this.active=[];}
}
const audio=new AudioDesk();
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function caption(s){$('caption').textContent=model.settings.subtitles?s:'';}
function save(){try{
 if(model.s.phase==='menu'){const previous=readSave();if(previous){previous.settings=model.settings;localStorage.setItem(SAVE,JSON.stringify(previous));}}
 else localStorage.setItem(SAVE,JSON.stringify(model.export()));
 localStorage.setItem(SETTINGS,JSON.stringify(model.settings));
}catch{toast('This browser could not save progress. Keep this tab open.');}}
function readSave(){try{return JSON.parse(localStorage.getItem(SAVE));}catch{return null;}}
function settings(){document.body.classList.toggle('grain',!model.settings.grainOff);document.body.classList.toggle('contrast',model.settings.highContrast);audio.mix();}
function syncPause(){model.s.paused=document.hidden||['pause','settings'].includes(overlay);if(model.s.paused){audio.pause();}else if(model.s.phase==='shift')audio.start();}
function openOverlay(name){overlay=name;if(name==='guide')model.guideOpened();syncPause();renderOverlay();render(true);}
function closeOverlay(force=false){if(overlay==='result'&&!force)return;overlay=null;$('overlay').hidden=true;$('game').inert=false;$('title').inert=false;syncPause();lastUI='';render(true);}
function button(action,label,disabled=false,extra=''){return '<button data-act="'+action+'" '+(disabled?'disabled ':'')+extra+'>'+label+'</button>';}
function start(mode){
  closeOverlay(true);model.newRun(mode,33033);engine.loop.wake();audio.start();save();render(true);
}
function continueGame(){
 const saved=readSave();if(!saved)return;
 try{model.restore(saved);}catch{toast('The save was invalid. Start a new week.');return;}
 overlay=null;$('overlay').hidden=true;settings();engine.loop.wake();if(model.s.phase==='shift')audio.start();
 if(['summary','fired','dark','win'].includes(model.s.phase)){overlay='result';renderOverlay();engine.loop.sleep();}
 render(true);
}
function renderOverlay(){
 if(!overlay){$('overlay').hidden=true;return;}$('overlay').hidden=false;$('game').inert=true;$('title').inert=true;
 let body='',title='',narrow=false;
 if(overlay==='pause'){
  title='A moment to breathe';narrow=true;body='<p>The shift clock is paused.</p><div class="actions">'+button('resume','Resume')+button('settings','Settings')+'</div><div class="actions">'+button('save-menu','Save & return to menu')+'</div>';
 }else if(overlay==='settings'){
  title='Settings';narrow=true;
  body='<label class="setting">Volume<input id="volume" data-setting="volume" type="range" min="0" max="1" step=".05" value="'+model.settings.volume+'"></label>';
  for(const [key,label] of [['music','Jukebox music'],['flickerOff','Flicker off'],['grainOff','Grain off'],['subtitles','Sound captions'],['slowPatience','Patience slows 25%'],['highContrast','High contrast'],['reducedMotion','Reduced motion']])body+='<label class="setting">'+label+'<input type="checkbox" data-setting="'+key+'" '+(model.settings[key]?'checked':'')+'></label>';
  body+='<p class="quiet">Visual settings never remove the textual evidence.</p>';
 }else if(overlay==='credits'){
  title='Credits';narrow=true;body='<h3>Graveyard Shift Diner · Fusion F033</h3><p>Concept: John-Ross Moyler · Collective AI Inc.</p><p>Hand-painted asset family generated for this project. Original synthesized organ music and foley. Engine: Phaser 3.90.0.</p><p>Pacifico and IBM Plex Mono, distributed under the SIL Open Font License.</p><p><a href="PHASER-LICENSE.md" target="_blank" rel="noopener">Phaser license</a> · <a href="assets/fonts/Pacifico-OFL.txt" target="_blank" rel="noopener">Pacifico license</a> · <a href="assets/fonts/IBMPlexMono-OFL.txt" target="_blank" rel="noopener">IBM Plex Mono license</a></p><p><a href="graveyard-shift-diner-game.zip" download>Download the portable game build</a></p>';
 }else if(overlay==='guide'){
  title='Field guide';const unlocked=content.creatures.filter(c=>model.progress.guide.includes(c.id));const c=unlocked.find(c=>c.id===guideTab);
  const r=content.regulars.find(r=>r.id===guideTab);let page;
  if(c)page='<img src="assets/characters/seated/'+c.id+'.png" alt="'+esc(c.name)+'"><h3>'+esc(c.name)+'</h3><p>Each encounter carries exactly two of these three tells.</p><ol>'+c.tells.map(t=>'<li>'+esc(observations[t])+'</li>').join('')+'</ol><p class="quiet">One unusual trait can be harmless. Find independent evidence.</p>';
  else if(r){
   const exception=model.progress.exceptions[r.id]||[];const steps=model.progress.stories[r.id]||0;
   page='<h3>'+esc(displayNames[r.id])+'</h3><p>Regular · a person with a history.</p><p>'+((r.id==='earl'||exception.length)&&r.false_tell?'Known harmless habit: '+esc(observations[r.false_tell]):'Record observed exceptions during service.')+'</p><h4>Stories remembered</h4><ul>'+r.story_steps.slice(0,steps).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+(steps?'':'<p class="quiet">Serve this regular well to learn their story.</p>');
  }else{guideTab=unlocked[0]?.id;page='<p>Select an entry.</p>';}
  body='<p class="quiet">'+(model.s.phase==='shift'?'The shift keeps running while you read.':'New entries arrive as the week progresses.')+'</p><div class="guide-layout"><nav class="guide-nav">'+unlocked.map(c=>button('guide-entry',esc(c.name),false,'data-id="'+c.id+'"')).join('')+'<h3>Regulars</h3>'+content.regulars.map(r=>button('guide-entry',esc(displayNames[r.id]),false,'data-id="'+r.id+'"')).join('')+'</nav><article class="guide-page">'+page+'</article></div>';
 }else if(overlay==='result'){
  const r=model.s.receipt;title=model.s.phase==='dark'?'The diner goes dark':model.s.phase==='fired'?'The last shift':model.s.phase==='win'?'Seven nights. Still burning.':'Closing time';
  const outcome=model.s.phase==='dark'?'Every Lantern is gone. The diner belongs to the road now.':model.s.phase==='fired'?'A second rent loan ends your week.':model.s.phase==='win'?'You kept the doors open and the light alive.':'Count the receipts, improve the diner, then return for another shift.';
  body='<p>'+outcome+'</p><div class="receipt"><h2>Shift receipt</h2><dl>'+[
   ['Night',r.night],['Sales',money(r.sales)],['Tips',money(r.tips)],['Wrong refusals','−'+money(r.lostSales)],['Rent','−'+money(r.rent)],['Rent loan',r.loan?'Yes · reputation −10':'None'],['Human guests served',r.humansServed],['Creatures refused',r.creaturesRefused],['Humans wrongly refused',r.humansRefused],['Customers walked out',r.walkouts],['Lanterns lost',r.lanternsLost]
  ].map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl><hr><dl><dt>Cash left</dt><dd>'+money(model.progress.cash)+'</dd><dt>Reputation</dt><dd>'+model.progress.reputation+'</dd><dt>Lanterns</dt><dd>'+model.progress.lanterns+' / 3</dd></dl></div>';
  if(model.s.phase==='summary'){
   body+='<h2 style="margin-top:24px">Between shifts</h2><div class="upgrades">'+upgrades.map(([id,name,price,desc,art])=>{
    const own=model.progress.upgrades.includes(id),folder=['mirror','burner-upgrade','hired-cook-work'].includes(art)?'upgrades':'props';
    return '<article class="upgrade"><img src="assets/'+folder+'/'+art+'.png" alt=""><div><h3>'+name+'</h3><p>'+desc+'</p>'+button('buy',own?'Installed':'Install · $'+price,own||model.progress.cash<price,'data-id="'+id+'"')+'</div></article>';
   }).join('')+'</div><div class="actions">'+button('next','Open for night '+(model.progress.night+1))+button('save-menu','Save & return to menu')+'</div>';
  }else body+='<div class="actions">'+button('new-week','New week')+button('new-endless','Endless mode')+button('save-menu','Return to menu')+'</div>';
 }
 $('overlay').innerHTML='<section class="modal '+(narrow?'narrow':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="modal-header"><h2>'+title+'</h2>'+(overlay==='result'?'':button('close','×',false,'aria-label="Close dialog" class="secondary"'))+'</div>'+body+'</section>';
 $('overlay').querySelector('button:not([disabled]),input')?.focus();
}
function render(force=false){
 if(!model||!sceneReady)return;
 const menu=model.s.phase==='menu',wasHidden=$('game').hidden;$('title').hidden=!menu;$('game').hidden=menu;
 if(!menu&&wasHidden)requestAnimationFrame(()=>engine.scale.refresh());
 if(menu){
  const exists=readSave();$('menu-actions').innerHTML=button('new-week','Start a new week')+(exists?button('continue','Continue saved game'):'')+button('new-endless','Endless shift')+button('settings','Settings')+button('credits','Credits');return;
 }
 const s=model.s,p=model.progress;
 $('cash').textContent=money(p.cash)+' / '+money(model.rent);$('night').textContent='NIGHT '+p.night+(p.mode==='week'?' / 7':' · ENDLESS');
 let minute=Math.floor(s.time/SHIFT_SECONDS*360)+23*60;let hour=Math.floor(minute/60)%24;
 $('clock').textContent=(hour%12||12)+':'+String(minute%60).padStart(2,'0')+' '+(hour<12?'AM':'PM');
 $('rep').textContent=p.reputation+' / 100';$('lanterns').textContent='●'.repeat(p.lanterns)+'○'.repeat(3-p.lanterns);
 $('dread').textContent='DREAD '+Math.round(s.dread)+' / 100';$('arrival-count').textContent=s.plan.length+' arrivals left · '+Math.max(0,Math.ceil((600-s.time)/60))+' min until close';
 $('tutorial').textContent=s.tutorial&&!s.tutorial.done?tutorial[s.tutorial.step]:s.time>=450&&p.night===7?'The Night Manager is watching. Three arrivals. Check the evidence.':s.time>540?'Last minute. Finish the grill before the lights go out.':'';
 const signature=[Math.floor(s.time),s.phase,s.selected,s.inspection?Math.ceil(s.inspection.remaining*4):'',...s.customers.map(c=>c.id+':'+c.state+':'+Math.ceil(c.patience)+':'+c.known.join(',')+':'+c.ready),...s.jobs.map(j=>Math.ceil(j.remaining*4))].join('|');
 if(!force&&signature===lastUI)return;lastUI=signature;
 $('table-list').innerHTML=SEATS.map((seat,i)=>{
  const c=model.active.find(c=>c.seat===i);return '<button data-act="select" data-id="'+(c?.id||0)+'" '+(c?'':'disabled')+' class="'+(c?.id===s.selected?'selected':'')+'">'+(i<6?'TABLE '+(i+1):'COUNTER '+(i-5))+'<small>'+(c?c.state==='lingering'?'Still here':c.ready?'Ready to serve':esc(c.state):'Empty')+'</small>'+(c&&['ordering','waiting'].includes(c.state)?'<div class="patience"><span style="width:'+c.patience/60*100+'%"></span></div>':'')+'</button>';
 }).join('');
 $('queue').innerHTML=model.active.filter(c=>c.state==='queued').map(c=>button('select','Guest waiting at door',false,'data-id="'+c.id+'"')).join('');
 const c=model.getCustomer(s.selected);const usable=c&&!['gone','refused'].includes(c.state);
 if(!usable)$('service').innerHTML='<h2>Work the floor</h2><p>Select a table or a guest at the door. Take orders, keep the burners moving, and inspect the details before serving.</p><p class="quiet">Keyboard: 1–6 tables · H hands · R reflection · Q question · S salt · C coffee · E serve · F refuse · Escape pause.</p>';
 else{
  const r=recipe(c);const busy=model.busy;const job=s.jobs.find(j=>j.customer===c.id);const before=['ordering','waiting','queued'].includes(c.state);
  const maxBurners=s.jobs.length>=model.burners;const reflected=c.checks?.includes('reflection');
  let evidence='';
  if(c.known.includes('extra-knuckles'))evidence+='<img class="evidence-image" src="assets/tells/hand-extra-knuckles.png" alt="Five fingers with extra knuckle joints">';
  if(reflected)evidence+='<div class="mirror" aria-label="'+(c.tells.includes('no-reflection')?'No customer reflection':'Customer reflection visible')+'">'+(c.tells.includes('no-reflection')?'':'<img src="assets/characters/seated/'+c.art+'.png" alt="Reflection">')+'</div>';
  $('service').innerHTML='<div class="service-head"><div><span class="eyebrow">'+tableName(c)+'</span><h2>'+esc(playerName(c))+'</h2></div><span class="cost">'+Math.ceil(c.patience)+' patience</span></div><div class="portrait"><img src="assets/characters/seated/'+c.art+'.png" alt="Selected guest">'+(c.checks?.includes('coffee')&&!c.tells.includes('cold-coffee')?'<img class="steam" src="assets/effects/coffee-steam.png" alt="Coffee steam">':'')+(c.known.includes('cold-breath')?'<img class="steam" src="assets/effects/cold-breath.png" alt="Cold breath">':'')+'</div>'+
  '<div class="order-line"><img src="assets/food/'+r.id+'.png" alt=""><p>'+esc(r.name)+'<br><strong>'+money(c.price)+'</strong></p></div>'+
  '<div class="service-actions">'+(c.state==='ordering'?button('order','Take order',busy,'data-id="'+c.id+'"'):c.state==='waiting'?button('cook',c.ready?'Plate ready':job?'Cooking…':'Start cooking',busy||Boolean(job)||maxBurners||c.ready,'data-id="'+c.id+'"'): '<p>'+esc(c.state==='lingering'?'The guest will not leave.':c.state==='eating'?'Eating · '+Math.ceil(c.eating)+'s':'Waiting for a seat.')+'</p>')+'</div>'+
  '<div class="inspect-actions">'+content.actions.map(a=>button('inspect',esc(a.visible_label),busy||!before,'data-id="'+c.id+'" data-action="'+a.id+'"')).join('')+'</div><p class="cost">'+(busy?'Inspecting '+esc(s.inspection.action)+' · '+s.inspection.remaining.toFixed(1)+'s':'Each check takes 4 seconds. The rest of the diner keeps moving.')+'</p>'+
  '<ul class="clues">'+c.known.map(t=>'<li>'+esc(observations[t])+'</li>').join('')+(c.checks?.length&&!c.known.length?'<li class="normal">No unusual evidence found in the completed checks.</li>':'')+'</ul>'+evidence+(c.line?'<p class="speech">“'+esc(c.line)+'”</p>':'')+
  '<div class="final-actions">'+button('serve','Serve',busy||!c.ready||!before,'data-id="'+c.id+'"')+button('refuse','Refuse',busy||!before,'data-id="'+c.id+'" class="danger"')+'</div><p class="cost">A wrong refusal costs '+money(c.price)+' and 8 reputation. One tell may be harmless.</p>';
 }
 $('kitchen-label').textContent=s.jobs.length+' / '+model.burners+' slots · '+Math.round((1+Math.round(s.dread)*.01)*100)+'% cook time';
 $('burners').innerHTML=Array.from({length:model.burners},(_,i)=>{
  const j=s.jobs[i];if(!j)return '<div class="burner empty">Burner '+(i+1)+' · free</div>';
  const c=model.getCustomer(j.customer),r=recipe(c);return '<div class="burner '+(j.ready?'ready':'')+'"><img src="assets/food/'+r.id+'.png" alt=""><div><p>'+esc(r.name)+'</p><p class="quiet">'+tableName(c)+'</p>'+(j.ready?button('serve','Serve plate',model.busy,'data-id="'+c.id+'"'):'<p>'+Math.ceil(j.remaining)+'s</p><progress value="'+(j.duration-j.remaining)+'" max="'+j.duration+'"></progress>')+'</div></div>';
 }).join('');
}
function act(action,el){
 const id=Number(el?.dataset.id)||model.s.selected;
 if(action==='new-week'||action==='new-endless'){if(model.s.phase==='shift')save();start(action==='new-week'?'week':'endless');return;}
 if(action==='continue'){continueGame();return;}
 if(action==='pause'){openOverlay('pause');return;}
 if(action==='settings'||action==='credits'||action==='guide'){openOverlay(action);return;}
 if(action==='resume'||action==='close'){closeOverlay();return;}
 if(action==='guide-entry'){guideTab=el.dataset.id;renderOverlay();return;}
 if(action==='save-menu'){save();closeOverlay(true);model.s.phase='menu';audio.pause();engine.loop.sleep();render(true);return;}
 if(action==='next'){closeOverlay(true);if(model.nextNight()){engine.loop.wake();audio.start();save();}render(true);return;}
 if(action==='buy'){if(model.buy(el.dataset.id)){audio.play('sfx-register');save();renderOverlay();}return;}
 if(action==='select'){if(id)model.select(id);render(true);return;}
 if(model.s.phase!=='shift')return;
 let ok=false;
 if(action==='order')ok=model.order(id);
 if(action==='cook')ok=model.cook(id);
 if(action==='serve')ok=model.serve(id);
 if(action==='refuse')ok=model.refuse(id);
 if(action==='inspect')ok=model.inspect(id,el.dataset.action);
 if(!ok)toast(model.busy?'Finish the current inspection first.':'That action is not available yet.');
 processEvents();render(true);
}
function processEvents(){
 for(const e of model.drain()){
  if(e.type==='bell'){audio.play(e.wrong?'sfx-wrong-bell':'sfx-door-bell');caption(e.wrong?'The door bell rings at the wrong pitch.':'The door bell rings.');}
  if(e.type==='cook'){audio.play('sfx-grill-sizzle');scene?.dotAction('pour',e.id);}
  if(e.type==='serve'){audio.play('sfx-plate-set');scene?.dotAction('serve',e.id);caption('A plate is set down.');}
  if(e.type==='inspect'){scene?.dotAction('inspect',e.id);if(!model.settings.reducedMotion){const c=model.getCustomer(e.id);if(c.seat!==null){scene.cameras.main.pan(SEATS[c.seat].x,300,250);scene.cameras.main.zoomTo(2,250);}}}
  if(e.type==='inspected'){if(!model.settings.reducedMotion){scene.cameras.main.pan(640,300,250);scene.cameras.main.zoomTo(1,250);}scene?.dotAction('idle');}
  if(e.type==='ready'){caption('A plate is ready on the grill.');}
  if(e.type==='pay'){audio.play('sfx-register');caption('The register rings.');}
  if(e.type==='refuse'){audio.play('sfx-refuse-door');scene?.dotAction('refuse',e.id);toast(e.correct?'The refusal was justified.':'That was a human. Lost '+money(e.price)+' and 8 reputation.');}
  if(e.type==='story'&&e.line){toast(e.line);}
  if(e.type==='walkout'){caption('An impatient guest leaves.');}
  if(e.type==='close'){
   if(e.lost){audio.play('sfx-lantern-gutter');if(!model.settings.reducedMotion)scene.cameras.main.shake(180,4/600);caption(e.lost+' Lantern'+(e.lost===1?'':'s')+' goes out.');}
   save();audio.pause();overlay='result';renderOverlay();engine.loop.sleep();
  }
 }
}
class DinerScene extends Phaser.Scene{
 constructor(){super('Diner');this.views=new Map();this.effectViews=[];this.lastFlicker=0;this.actionEnds=0;}
 preload(){
  this.load.on('progress',v=>{$('boot-progress').value=v;$('boot-label').textContent='Preparing the diner · '+Math.round(v*100)+'%';});
  this.load.on('loaderror',file=>{console.error('Asset failed',file.src);$('boot-label').textContent='Some assets could not load. Check the connection and reload.';});
  this.load.image('room','assets/environment/diner-original.png');
  for(const id of Object.keys(content.clips))this.load.spritesheet('dot-'+id,'assets/animations/dot/'+id+'.png',{frameWidth:512,frameHeight:512});
  for(const id of content.characterIds){this.load.image('seat-'+id,'assets/characters/seated/'+id+'.png');this.load.image('stand-'+id,'assets/characters/standing/'+id+'.png');}
  for(const id of ['coffee-steam','cold-breath','door-fog','sleeve-dust','wet-footprints'])this.load.image(id,'assets/effects/'+id+'.png');
  this.load.image('cup','assets/props/coffee-cup.png');this.load.image('manager','assets/upgrades/night-manager.png');
  this.load.image('hired-cook','assets/upgrades/hired-cook-work.png');this.load.image('mirror','assets/upgrades/mirror.png');this.load.image('salt','assets/props/salt-pepper.png');
 }
 create(){
  scene=this;this.add.image(640,312.5,'room').setDisplaySize(1280,475).setDepth(0);
  // Actual furniture pixels occlude seated torsos; Dot remains in the foreground.
  const source=this.textures.get('room').getSourceImage();const fg=this.textures.createCanvas('furniture',1280,600);
  fg.context.drawImage(source,0,310,source.width,source.height-310,0,75+310*1280/source.width,1280,(source.height-310)*1280/source.width);fg.refresh();
  this.add.image(0,0,'furniture').setOrigin(0).setDepth(20);
  for(const [id,c] of Object.entries(content.clips))this.anims.create({key:'dot-'+id,frames:c.frames.map(frame=>({key:'dot-'+id,frame})),frameRate:c.frameRate,repeat:c.repeat});
  this.dot=this.add.sprite(950,535,'dot-idle').setOrigin(.5,.953125).setDisplaySize(310,310).setDepth(30);this.dot.play('dot-idle');
  this.fog=this.add.image(90,450,'door-fog').setDisplaySize(220,180).setAlpha(.25).setDepth(35);
  this.manager=this.add.image(1225,300,'manager').setDisplaySize(120,190).setDepth(15).setVisible(false);
  this.hired=this.add.image(1180,400,'hired-cook').setOrigin(.5,.95).setDisplaySize(255,255).setDepth(12).setVisible(false);
  this.mirrors=[6,7].map(i=>this.add.image(SEATS[i].x,180,'mirror').setDisplaySize(90,85).setDepth(5).setVisible(false));
  this.salts=SEATS.map(p=>this.add.image(p.x+14,p.y+3,'salt').setDisplaySize(20,20).setDepth(26).setVisible(false));
  this.light=this.add.rectangle(640,300,1280,600,0x06090c,.2).setDepth(50).setVisible(false);
  this.input.on('pointerdown',p=>{const at={x:p.worldX,y:p.worldY};const i=SEATS.findIndex(s=>Math.abs(at.x-s.x)<55&&Math.abs(at.y-s.y)<130);if(i>=0){const c=model.active.find(c=>c.seat===i);if(c){model.select(c.id);render(true);}}});
  sceneReady=true;$('boot').hidden=true;settings();render(true);engine.loop.sleep();
 }
 dotAction(action,id){
  if(!this.dot)return;const c=model.getCustomer(id);if(c?.seat!==null&&c?.seat!==undefined){
   const x=Math.min(1130,SEATS[c.seat].x+70);this.tweens.killTweensOf(this.dot);
   this.dot.setFlipX(x<this.dot.x);
   if(!model.settings.reducedMotion){this.dot.play('dot-walk');this.tweens.add({targets:this.dot,x,duration:300,onComplete:()=>{this.dot.setFlipX(true);this.dot.play('dot-'+action);this.actionEnds=this.time.now+900;}});}
   else{this.dot.x=x;this.dot.setFlipX(true);this.dot.play('dot-'+action);this.actionEnds=this.time.now+900;}
  }else{this.dot.play('dot-'+action);this.actionEnds=this.time.now+900;}
 }
 update(time,delta){
  if(!sceneReady||model.s.phase!=='shift')return;
  model.tick(Math.min(delta/1000,.2));processEvents();
  const liveIds=new Set(model.s.customers.map(c=>c.id));
  for(const [id,v] of this.views){if(!liveIds.has(id)){Object.values(v).forEach(o=>o.destroy());this.views.delete(id);}}
  for(const c of model.s.customers){
   if(['gone','refused'].includes(c.state)){const v=this.views.get(c.id);if(v){Object.values(v).forEach(o=>o.destroy());this.views.delete(c.id);}continue;}
   if(c.seat===null)continue;const pos=SEATS[c.seat];let v=this.views.get(c.id);
   if(!v){
    const body=this.add.image(pos.x,pos.y,'seat-'+c.art).setOrigin(.5,.953125).setDisplaySize(150,150).setDepth(10);
    const steam=this.add.image(pos.x+37,pos.y-22,'coffee-steam').setDisplaySize(24,55).setAlpha(.35).setDepth(25);
    const breath=this.add.image(pos.x+25,pos.y-80,'cold-breath').setDisplaySize(50,30).setAlpha(.45).setDepth(11);
    const dust=this.add.image(pos.x-28,pos.y-40,'sleeve-dust').setDisplaySize(30,30).setAlpha(.3).setDepth(11);
    const cup=this.add.image(pos.x+37,pos.y+8,'cup').setDisplaySize(28,28).setDepth(24);
    const footprints=this.add.image(pos.x+6,pos.y+80,'wet-footprints').setDisplaySize(48,42).setAlpha(.4).setDepth(22);
    const reflected=this.add.image(pos.x,180,'seat-'+c.art).setDisplaySize(48,70).setFlipX(true).setAlpha(.45).setDepth(6);
    v={body,steam,breath,dust,cup,footprints,reflected};this.views.set(c.id,v);
   }
   const motion=!model.settings.reducedMotion&&!model.s.paused&&c.state!=='lingering';
   v.body.y=pos.y+(motion?Math.sin(time*.0015+c.id)*1.2:0);v.body.setRotation(c.state==='eating'&&motion?Math.sin(time*.002)*.006:0);
   v.steam.setVisible(!c.tells.includes('cold-coffee'));v.breath.setVisible(c.tells.includes('cold-breath'));v.dust.setVisible(c.tells.includes('sleeve-dust'));
   v.cup.setVisible(true);
   v.footprints.setVisible(c.tells.includes('wet-footprints'));
   v.reflected.setVisible(c.seat>=6&&model.progress.upgrades.includes('mirror')&&!c.tells.includes('no-reflection'));
  }
  if(model.busy&&this.actionEnds<time){this.dot.anims.stop();this.dot.setTexture('dot-inspect',2);}
  else if(!model.busy&&this.actionEnds<time&&this.dot.anims.currentAnim?.key!=='dot-idle')this.dot.play('dot-idle');
  this.fog.y=450+(!model.settings.reducedMotion?Math.sin(time*.0005)*4:0);
  this.manager.setVisible(model.progress.night===7&&model.s.time>440);
  this.hired.setVisible(model.progress.upgrades.includes('cook'));this.mirrors.forEach(m=>m.setVisible(model.progress.upgrades.includes('mirror')));
  this.salts.forEach((m,i)=>m.setVisible(model.progress.upgrades.includes('salt')&&model.active.some(c=>c.seat===i)));
  if(model.s.dread>70&&!model.settings.flickerOff&&!model.s.paused){
   if(time>this.lastFlicker){this.light.setVisible(true);this.time.delayedCall(100,()=>this.light.setVisible(false));this.lastFlicker=time+6000+Math.random()*4000;}
  }else this.light.setVisible(false);
  audio.mix();renderClock+=delta;saveClock+=delta;
  if(renderClock>250){renderClock=0;render();}
  if(saveClock>15000){saveClock=0;save();}
 }
}
async function boot(){
 try{
  const names={creatures:'creatures',regulars:'regulars',recipes:'recipes',tells:'tells',actions:'inspection-actions',dialogue:'dialogue-180',humanTalk:'human-small-talk'};
  content={};await Promise.all(Object.entries(names).map(async([key,file])=>{const response=await fetch('assets/data/'+file+'.json');if(!response.ok)throw new Error('Missing '+file);content[key]=await response.json();}));
  content.clips=await(await fetch('assets/animations/dot/clips.json')).json();
  content.characterIds=['earl','vonda','pruitt-a','pruitt-b','coach-hale','ines','ricky','postal-worker','mechanic','salesman','warehouse-worker','librarian',...content.creatures.map(c=>c.id)];
  model=new Diner(content);try{model.settings=normaliseSettings(JSON.parse(localStorage.getItem(SETTINGS)));}catch{}
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)model.settings.reducedMotion=true;
  engine=new Phaser.Game({type:Phaser.CANVAS,parent:'world',width:1280,height:600,backgroundColor:'#0E1418',transparent:false,
   scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[DinerScene],audio:{noAudio:true},render:{antialias:true,roundPixels:false},fps:{target:60,min:20}});
  document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(el&&!el.disabled)act(el.dataset.act,el);});
  document.addEventListener('change',e=>{const key=e.target.dataset.setting;if(!key)return;model.settings[key]=key==='volume'?Number(e.target.value):e.target.checked;settings();save();});
  document.addEventListener('keydown',e=>{
   if(e.target.matches('input,textarea,select'))return;
   if(e.key==='Escape'){if(overlay)closeOverlay();else if(model.s.phase==='shift')openOverlay('pause');return;}
   if(overlay||model.s.phase!=='shift')return;const key=e.key.toLowerCase();
   if(/^[1-6]$/.test(key)){const c=model.active.find(c=>c.seat===Number(key)-1);if(c){model.select(c.id);render(true);}return;}
   const map={h:'hands',r:'reflection',q:'question',s:'salt',c:'coffee'};
   if(map[key])act('inspect',{dataset:{id:String(model.s.selected),action:map[key]}});
   if(key==='e')act('serve');if(key==='f')act('refuse');
  });
  document.addEventListener('visibilitychange',()=>{syncPause();if(document.hidden)save();});
  window.addEventListener('pagehide',save);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
 }catch(error){console.error(error);$('boot-label').textContent='The diner could not open. '+error.message;const b=document.createElement('button');b.textContent='Retry loading';b.onclick=()=>location.reload();$('boot').append(b);}
}
boot();
