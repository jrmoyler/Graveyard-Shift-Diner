export const SHIFT_SECONDS=600;
export const SAVE_VERSION=1;
export const DEFAULT_SETTINGS={volume:.55,music:true,flickerOff:true,grainOff:true,subtitles:true,slowPatience:false,highContrast:false,reducedMotion:false};
export function normaliseSettings(raw){
 const result={...DEFAULT_SETTINGS};if(!raw||typeof raw!=='object')return result;
 for(const key of Object.keys(result)){if(key==='volume'){if(Number.isFinite(raw.volume))result.volume=clamp(raw.volume,0,1);}else if(typeof raw[key]==='boolean')result[key]=raw[key];}
 return result;
}
export const SEATS=[{x:170,y:315},{x:309,y:315},{x:449,y:315},{x:584,y:315},{x:720,y:315},{x:848,y:315},{x:1028,y:319,counter:true},{x:1138,y:319,counter:true}];
export function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function emptyProgress(mode,seed){return {cash:120,reputation:60,lanterns:3,night:1,loans:0,mode,seed:seed>>>0,upgrades:[],guide:['hollow-driver'],exceptions:{},stories:{},bestNight:0};}
export class Diner {
 constructor(content,progress=null){this.content=content;this.progress=progress?structuredClone(progress):emptyProgress('week',33033);this.s={phase:'menu',time:0,dread:0,customers:[],plan:[],jobs:[],inspection:null,selected:null,paused:false,receipt:null,tutorial:null};this.events=[];this.settings={...DEFAULT_SETTINGS};}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){return this.events.splice(0);}
 get active(){return this.s.customers.filter(c=>!['gone','refused'].includes(c.state));}
 get burners(){return this.progress.upgrades.includes('burners')?8:4;}
 get rent(){return this.progress.mode==='endless'?180+25*(this.progress.night-1):180+20*Math.max(0,this.progress.night-3);}
 get busy(){return Boolean(this.s.inspection);}
 newRun(mode='week',seed=33033){this.progress=emptyProgress(mode,seed);this.s.phase='menu';this.startNight();}
 getCustomer(id){return this.s.customers.find(c=>c.id===id);}
 startNight(){
  const n=this.progress.night;const unlocked=['hollow-driver','fog-kin','under-sleeper','lamp-moth','pale-hitcher','reflection-twin'].slice(0,Math.min(n,6));
  this.progress.guide=[...new Set([...this.progress.guide,...unlocked])];
  const random=rng(this.progress.seed+n*1237);const count=Math.min(28,14+2*n);
  const regulars=['earl','vonda','pruitt-a','pruitt-b','coach-hale','ines','ricky'];const incidental=['postal-worker','mechanic','salesman','warehouse-worker','librarian'];
  const plan=[];
  for(let i=0;i<count;i++){
   let creature=random()<Math.min(.35,.1+.04*(n-1));
   if(n===1&&i===0)creature=false;if(n===1&&i===1)creature=true;
   if(n===7&&i>=count-3)creature=true;
   const type=creature?unlocked[Math.floor(random()*unlocked.length)]:null;
   const humanId=i===0?'earl':i<regulars.length?regulars[i]:incidental[Math.floor(random()*incidental.length)];
   const regularId=humanId.startsWith('pruitt')?'pruitt-twins':regulars.includes(humanId)?humanId:null;
   const reg=this.content.regulars.find(r=>r.id===regularId);
   let tells=[];
   if(creature){const pool=this.content.creatures.find(c=>c.id===type).tells;const omit=Math.floor(random()*3);tells=pool.filter((_,j)=>j!==omit);}
   else if(reg?.false_tell){tells=[reg.false_tell];}
   else if(random()<.25){const harmless=['refuses-salt','no-car','old-coins'];tells=[harmless[Math.floor(random()*harmless.length)]];}
   if(n===1&&i===1)tells=['no-reflection','cold-coffee'];
   let at=i===0?0:i===1&&n===1?30:70+(i-2)*440/Math.max(1,count-3);
   // Two rush groups, with ordinary spaced arrivals elsewhere.
   if(i>=Math.floor(count*.28)&&i<Math.floor(count*.28)+3)at=200+(i-Math.floor(count*.28))*4;
   if(i>=Math.floor(count*.68)&&i<Math.floor(count*.68)+4)at=450+(i-Math.floor(count*.68))*4;
   if(n===7&&i>=count-3)at=450+(i-(count-3))*3;
   const recipe=this.content.recipes[(n===1&&i===0)?0:Math.floor(random()*this.content.recipes.length)];
   let art=creature?type:humanId;
   // Appearance never guarantees identity. Ordinary walk-ins can use the same
   // disguise bases, and later creatures can resemble ordinary travelers.
   if(i>6&&random()<.35)art=creature?incidental[Math.floor(random()*incidental.length)]:unlocked[Math.floor(random()*unlocked.length)];
   plan.push({id:n*100+i+1,at,creature,type,art,regularId:creature?null:regularId,tells,recipeId:recipe.id,price:recipe.price,cookSeconds:recipe.cook_seconds,patience:60,known:[],state:'planned',seat:null,served:false,payment:false,tip:0});
  }
  plan.sort((a,b)=>a.at-b.at);
  this.s={phase:'shift',time:0,dread:0,customers:[],plan,jobs:[],inspection:null,selected:null,paused:false,receipt:null,
   summary:{sales:0,tips:0,lostSales:0,humansRefused:0,creaturesRefused:0,creaturesServed:0,humansServed:0,walkouts:0},
   tutorial:n===1?{step:0,done:false}:null};
  this.tick(0);this.emit('night',{night:n});if(n===7)this.emit('manager');
 }
 seat(c){
  const used=new Set(this.active.filter(x=>x.seat!==null).map(x=>x.seat));
  const seat=SEATS.findIndex((_,i)=>!used.has(i));if(seat<0){c.state='queued';return;}
  c.seat=seat;c.state='ordering';this.emit('bell',{wrong:c.tells.includes('old-coins')&&c.type==='pale-hitcher'&&this.progress.upgrades.includes('bell')});
  if(this.progress.upgrades.includes('mirror')&&SEATS[seat].counter)this.reveal(c,'reflection',true);
  if(this.progress.upgrades.includes('salt'))this.reveal(c,'salt',true);
 }
 tick(dt){
  if(this.s.phase!=='shift'||this.s.paused)return;
  dt=clamp(dt,0,5);this.s.time+=dt;this.s.dread=clamp(this.s.dread-dt/10,0,100);
  while(this.s.plan.length&&this.s.plan[0].at<=this.s.time){
   const c=this.s.plan.shift();
   if(c.type==='reflection-twin'&&c.tells.includes('duplicate-regular')){
    const other=this.active.find(x=>x.regularId&&!x.creature&&x.seat!==null);
    if(other){c.art=other.art;c.matchId=other.id;}else c.tells=['mirrored-hair','wrong-hand'];
   }
   this.s.customers.push(c);this.seat(c);if(this.s.selected===null)this.s.selected=c.id;this.emit('arrival',{id:c.id});
  }
  for(const c of this.active){
   if(c.state==='queued')this.seat(c);
   if(['ordering','waiting','queued'].includes(c.state)){
    c.patience=Math.max(0,c.patience-dt*(this.s.dread>50?1.5:1)*(this.settings.slowPatience?.75:1));
    if(c.patience===0){c.state='gone';this.s.jobs=this.s.jobs.filter(j=>j.customer!==c.id);this.s.summary.walkouts++;this.emit('walkout',{id:c.id});}
   }else if(c.state==='eating'){
    c.eating=Math.max(0,c.eating-dt);
    if(c.eating===0)this.pay(c);
   }
  }
  for(const j of this.s.jobs){j.remaining=Math.max(0,j.remaining-dt);if(j.remaining===0&&!j.ready){j.ready=true;const c=this.getCustomer(j.customer);if(c&&c.state==='waiting'){c.ready=true;this.emit('ready',{id:c.id});}}}
  if(this.s.inspection){
   this.s.inspection.remaining=Math.max(0,this.s.inspection.remaining-dt);
   if(this.s.inspection.remaining===0){
    const {customer,action}=this.s.inspection;const c=this.getCustomer(customer);this.s.inspection=null;
    if(c&&!['gone','refused'].includes(c.state)){this.reveal(c,action);this.emit('inspected',{id:c.id,action});}
   }
  }
  if(this.s.time>=SHIFT_SECONDS)this.close();
 }
 allow(c){return this.s.phase==='shift'&&!this.s.paused&&!this.busy&&c&&['ordering','waiting','queued'].includes(c.state);}
 select(id){if(this.getCustomer(id)){this.s.selected=id;this.emit('select',{id});return true;}return false;}
 order(id){
  const c=this.getCustomer(id);if(!this.allow(c)||c.state!=='ordering')return false;
  c.state='waiting';c.ordered=true;this.emit('order',{id});this.tutorial(1);return true;
 }
 cook(id){
  const c=this.getCustomer(id);if(!this.allow(c)||c.state!=='waiting'||c.ready||this.s.jobs.some(j=>j.customer===id)||this.s.jobs.length>=this.burners)return false;
  const duration=c.cookSeconds*clamp(1+this.s.dread*.01,1,2)*(this.progress.upgrades.includes('cook')?.75:1);
  this.s.jobs.push({customer:id,remaining:duration,duration,ready:false});this.emit('cook',{id});return true;
 }
 serve(id){
  const c=this.getCustomer(id);if(!this.allow(c)||c.state!=='waiting'||!c.ready)return false;
  c.served=true;c.state='eating';c.eating=20;c.servedPatience=c.patience;c.tip=c.price*(c.patience/60)*(this.progress.reputation/100)*.3;
  this.s.jobs=this.s.jobs.filter(j=>j.customer!==id);
  if(c.creature){this.s.dread=clamp(this.s.dread+15,0,100);this.s.summary.creaturesServed++;}
  else{this.s.summary.humansServed++;this.progress.reputation=clamp(this.progress.reputation+1,0,100);}
  this.emit('serve',{id});if(c.art==='earl')this.tutorial(2);return true;
 }
 refuse(id){
  const c=this.getCustomer(id);if(!this.allow(c))return false;
  if(c.creature){
   this.s.dread=clamp(this.s.dread-10,0,100);this.s.summary.creaturesRefused++;
   const witness=this.active.some(x=>x.id!==id&&!x.creature&&x.regularId&&x.seat!==null);
   if(witness)this.progress.reputation=clamp(this.progress.reputation+2,0,100);
   this.progress.guide=[...new Set([...this.progress.guide,c.type])];
  }else{
   this.progress.cash-=c.price;this.progress.reputation=clamp(this.progress.reputation-8,0,100);
   this.s.summary.lostSales+=c.price;this.s.summary.humansRefused++;
   if(c.regularId&&c.known.length)this.progress.exceptions[c.regularId]=c.known;
  }
  c.state='refused';this.s.jobs=this.s.jobs.filter(j=>j.customer!==id);this.emit('refuse',{id,correct:c.creature,price:c.price});
  if(c.id===102&&c.creature)this.tutorial(5);return true;
 }
 inspect(id,action){
  const c=this.getCustomer(id);if(!this.allow(c)||!this.content.actions.some(a=>a.id===action))return false;
  this.s.inspection={customer:id,action,remaining:4};this.emit('inspect',{id,action});return true;
 }
 reveal(c,action,free=false){
  const found=c.tells.filter(t=>this.content.tells.find(x=>x.id===t)?.action===action);
  c.known=[...new Set([...c.known,...found])];c.checks=[...new Set([...(c.checks||[]),action])];
  if(c.regularId&&!c.creature&&found.length)this.progress.exceptions[c.regularId]=[...new Set([...(this.progress.exceptions[c.regularId]||[]),...found])];
  if(action==='question'){
   const matches=this.content.dialogue.filter(d=>found.includes(d.tell));
   const line=matches[c.id%Math.max(1,matches.length)]?.line||this.content.humanTalk[c.id%this.content.humanTalk.length];
   c.line=line.replaceAll('{name}','Dot').replaceAll('{previous_sentence}','Where are you headed?').slice(0,120);
  }
  if(c.id===102&&action==='reflection')this.tutorial(4);
  this.emit('reveal',{id:c.id,action,found,free});
 }
 pay(c){
  if(c.payment)return;c.payment=true;this.progress.cash+=c.price+c.tip;
  this.s.summary.sales+=c.price;this.s.summary.tips+=c.tip;
  if(c.regularId&&!c.creature){const step=this.progress.stories[c.regularId]||0;const r=this.content.regulars.find(r=>r.id===c.regularId);
   if(step<5){this.progress.stories[c.regularId]=step+1;this.emit('story',{name:c.regularId,line:r?.story_steps[step]});}}
  c.state=c.creature?'lingering':'gone';this.emit('pay',{id:c.id});
 }
 tutorial(step){if(this.s.tutorial){this.s.tutorial.step=Math.max(this.s.tutorial.step,step);if(step>=5)this.s.tutorial.done=true;}}
 guideOpened(){this.tutorial(3);}
 close(){
  if(this.s.phase!=='shift')return;
  const due=this.rent;const lost=this.s.customers.filter(c=>c.creature&&c.served).length;
  this.progress.lanterns=clamp(this.progress.lanterns-lost,0,3);
  let loan=false;
  if(this.progress.cash<due){loan=true;this.progress.loans++;this.progress.reputation=clamp(this.progress.reputation-10,0,100);this.progress.cash=0;}
  else this.progress.cash-=due;
  this.progress.bestNight=Math.max(this.progress.bestNight,this.progress.night);
  this.s.receipt={...this.s.summary,night:this.progress.night,rent:due,loan,lanternsLost:lost,cash:this.progress.cash,reputation:this.progress.reputation,lanterns:this.progress.lanterns};
  this.s.inspection=null;this.s.paused=false;
  this.s.phase=this.progress.lanterns===0?'dark':this.progress.loans>=2?'fired':this.progress.mode==='week'&&this.progress.night>=7?'win':'summary';
  this.emit('close',{lost,loan,phase:this.s.phase});
 }
 nextNight(){if(this.s.phase!=='summary')return false;this.progress.night++;if(this.progress.mode==='endless'&&this.progress.night%7===1)this.progress.loans=0;this.startNight();return true;}
 buy(id){
  const upgrades={mirror:150,bell:80,burners:200,salt:60,cook:250};
  if(this.s.phase!=='summary'||!Object.hasOwn(upgrades,id)||this.progress.upgrades.includes(id)||this.progress.cash<upgrades[id])return false;
  this.progress.cash-=upgrades[id];this.progress.upgrades.push(id);this.emit('upgrade',{id});return true;
 }
 export(){return {version:SAVE_VERSION,progress:this.progress,state:this.s,settings:this.settings};}
 restore(value){
  if(!value||value.version!==SAVE_VERSION||!value.progress||!value.state)throw new Error('Unsupported save');
  const p=value.progress;
  if(!Number.isFinite(p.cash)||!Number.isInteger(p.night)||p.night<1||p.night>10000||!Number.isFinite(p.reputation)||!Array.isArray(p.upgrades)||!['week','endless'].includes(p.mode))throw new Error('Invalid save');
  if(!Array.isArray(value.state.customers)||!Array.isArray(value.state.plan)||!Array.isArray(value.state.jobs)||!['menu','shift','summary','fired','dark','win'].includes(value.state.phase))throw new Error('Invalid state');
  if(value.state.customers.length>100||value.state.plan.length>28)throw new Error('Oversized save');
  if(!Number.isInteger(p.lanterns)||p.lanterns<0||p.lanterns>3||p.reputation<0||p.reputation>100||!Number.isInteger(p.loans)||p.loans<0||p.loans>2||!Array.isArray(p.guide)||!p.stories||!p.exceptions)throw new Error('Invalid resources');
  if(p.upgrades.some(k=>!['mirror','bell','burners','salt','cook'].includes(k))||p.upgrades.length>5)throw new Error('Invalid upgrades');
  const s=value.state;
  if(!Number.isFinite(s.time)||s.time<0||s.time>605||!Number.isFinite(s.dread)||s.dread<0||s.dread>100)throw new Error('Invalid clock');
  const ids=new Set(),art=new Set(['earl','vonda','pruitt-a','pruitt-b','coach-hale','ines','ricky','postal-worker','mechanic','salesman','warehouse-worker','librarian',...this.content.creatures.map(c=>c.id)]);
  for(const c of [...s.customers,...s.plan]){
   if(!Number.isInteger(c.id)||ids.has(c.id)||!art.has(c.art)||!this.content.recipes.some(r=>r.id===c.recipeId)||!Number.isFinite(c.patience)||c.patience<0||c.patience>60||!Number.isFinite(c.price)||!Array.isArray(c.tells)||!Array.isArray(c.known))throw new Error('Invalid customer');
   if(!['planned','ordering','waiting','queued','eating','lingering','gone','refused'].includes(c.state)||c.tells.some(t=>!this.content.tells.some(x=>x.id===t)))throw new Error('Invalid customer state');
   if(c.seat!==null&&(!Number.isInteger(c.seat)||c.seat<0||c.seat>=SEATS.length))throw new Error('Invalid seat');
   if(c.state==='eating'&&(!Number.isFinite(c.eating)||c.eating<0))throw new Error('Invalid meal');
   ids.add(c.id);
  }
  for(const j of s.jobs)if(!ids.has(j.customer)||!Number.isFinite(j.remaining)||!Number.isFinite(j.duration)||j.duration<=0||j.remaining<0||j.remaining>j.duration)throw new Error('Invalid burner');
  if(s.inspection&&(!ids.has(s.inspection.customer)||!this.content.actions.some(a=>a.id===s.inspection.action)||!Number.isFinite(s.inspection.remaining)||s.inspection.remaining<0||s.inspection.remaining>4))throw new Error('Invalid inspection');
  if(s.phase==='shift'&&!s.summary)throw new Error('Missing summary');
  if(['summary','dark','fired','win'].includes(s.phase)&&!s.receipt)throw new Error('Missing receipt');
  this.progress=structuredClone(p);this.s=structuredClone(value.state);this.s.paused=false;
  this.settings=normaliseSettings(value.settings);
 }
}
