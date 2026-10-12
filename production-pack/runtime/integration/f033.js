/** Phaser 3 asset adapter. Call preload in your scene's preload, create in create.
 * The package is assets and adapters, not the game's economy or customer generator.
 */
export const DOT_CLIPS = {
 idle:{count:4,order:[0,1,2,3,2,1],fps:3,repeat:-1},
 walk:{count:8,order:[0,1,2,3,4,5,6,7],fps:8,repeat:-1},
 serve:{count:4,order:[0,1,2,3],fps:6,repeat:0},
 pour:{count:4,order:[0,1,2,3],fps:4,repeat:0},
 inspect:{count:4,order:[0,1,2,2,3],fps:5,repeat:0},
 refuse:{count:4,order:[0,1,2,3],fps:6,repeat:0},
 flinch:{count:4,order:[0,1,2,3],fps:7,repeat:0}
};
export function preloadF033(scene,base=''){
 for(const action of Object.keys(DOT_CLIPS))scene.load.spritesheet('dot-'+action,base+'runtime/animations/dot/'+action+'.png',{frameWidth:512,frameHeight:512});
 for(const name of ['diner-original','diner-rear','title-keyart'])scene.load.image(name,base+'runtime/environment/'+name+'.png');
 for(const name of ['coffee-steam','cold-breath','door-fog','sleeve-dust','wet-footprints','lantern-flame'])scene.load.image(name,base+'runtime/effects/'+name+'.png');
 for(const name of ['coffee-cup','napkin-dispenser','lantern-lit','lantern-out'])scene.load.image(name,base+'runtime/props/'+name+'.png');
 for(const name of ['music-jukebox','music-dread-drone','sfx-door-bell','sfx-coffee-pour','sfx-grill-sizzle','sfx-register','sfx-plate-set','sfx-refuse-door','sfx-lantern-gutter','sfx-neon-buzz','sfx-wrong-bell'])scene.load.audio(name,[base+'runtime/audio/'+name+'.ogg',base+'runtime/audio/'+name+'.wav']);
 scene.load.json('f033-creatures',base+'runtime/data/creatures.json');
 scene.load.json('f033-tells',base+'runtime/data/tells.json');
 scene.load.json('f033-dialogue',base+'runtime/data/dialogue-180.json');
}
export function createDotAnimations(scene){
 for(const [name,c] of Object.entries(DOT_CLIPS)){
  const key='dot-'+name;if(scene.anims.exists(key))continue;
  scene.anims.create({key,frames:c.order.map(frame=>({key,frame})),frameRate:c.fps,repeat:c.repeat});
 }
}
export function configureDot(sprite){return sprite.setOrigin(.5,.953125);}
export function evidenceLayers(tells=[]){
 const set=new Set(tells);
 return {reflectionVisible:!set.has('no-reflection'),coffeeSteamVisible:!set.has('cold-coffee'),
  breathVisible:set.has('cold-breath'),dustVisible:set.has('sleeve-dust'),wetFootprintsVisible:set.has('wet-footprints'),
  extraKnuckles:set.has('extra-knuckles'),shadowRadians:set.has('shadow-offset')?8*Math.PI/180:0,
  mirrorHairPart:set.has('mirrored-hair'),wrongHand:set.has('wrong-hand'),blinkEnabled:!set.has('never-blinks'),
  carVisible:!set.has('no-car'),oldCoins:set.has('old-coins'),neonGaze:set.has('drawn-to-neon')};
}
export function fallbackLine(lines,{tells=[],name='Dot',previousSentence='',seed=0}={}){
 const pool=lines.filter(x=>tells.includes(x.tell));
 if(!pool.length)return 'Something hot, please.';
 const item=pool[Math.abs(seed|0)%pool.length];
 if(item.tell==='echo-sentence')return previousSentence.slice(0,120);
 const line=item.line.replaceAll('{name}',name.slice(0,32)).replaceAll('{previous_sentence}',previousSentence.slice(0,70));
 return line.slice(0,120);
}
/** Code-driven NPC motion, with no implied hand-drawn limb cycle. */
export function customerTransform(state,elapsedMs,reducedMotion=false){
 const t=elapsedMs/1000;
 const breathe=reducedMotion?0:Math.sin(t*Math.PI*1.25)*.003;
 return {scaleY:state==='lingering'?1:1+breathe,leanRadians:state==='eating'&&!reducedMotion?Math.sin(t*2)*.012:0,
  pose:['arrive','paying','leave','refused'].includes(state)?'standing':'seated'};
}
/** Independent flicker/grain settings must never change the tell set. */
export function accessibilityEffects({flickerOff=false,grainOff=false,reducedMotion=false}={}){
 return {flickerEnabled:!flickerOff,grainOpacity:grainOff?0:.06,atmosphereMotion:!reducedMotion};
}
