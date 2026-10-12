import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(new URL('../dist',import.meta.url).pathname),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
test('bundled Phaser is present and syntax-valid',()=>{const phaser=fs.readFileSync(path.join(root,'phaser.min.js'),'utf8');assert(phaser.length>1000000);new vm.Script(phaser);});
test('all constant image, font, style and script URLs resolve locally',()=>{
 const files=['app.js','index.html','style.css','sw.js'];let count=0;
 for(const name of files){
  const code=fs.readFileSync(path.join(root,name),'utf8');
  const re=/(?:src=|href=|url\()(?:"|')([^"'()]+)(?:"|')/g;for(const m of code.matchAll(re)){
   const url=m[1];if(url.startsWith('data:')||url.includes('http')||url.includes('+')||url.includes(' ')||url.includes('<'))continue;
   assert(fs.existsSync(path.join(root,url)),url);count++;
  }
 }assert(count>10);
});
test('all character, food, animation, effects and upgrade declarations have assets',()=>{
 const ids=['earl','vonda','pruitt-a','pruitt-b','coach-hale','ines','ricky','postal-worker','mechanic','salesman','warehouse-worker','librarian','hollow-driver','fog-kin','under-sleeper','lamp-moth','reflection-twin','pale-hitcher'];
 for(const id of ids)for(const pose of ['standing','seated'])assert(fs.existsSync(path.join(root,'assets/characters',pose,id+'.png')));
 const recipes=JSON.parse(fs.readFileSync(path.join(root,'assets/data/recipes.json')));
 for(const r of recipes)assert(fs.existsSync(path.join(root,'assets/food',r.id+'.png')));
 const clips=JSON.parse(fs.readFileSync(path.join(root,'assets/animations/dot/clips.json')));
 for(const id of Object.keys(clips))assert(fs.existsSync(path.join(root,'assets/animations/dot',id+'.png')));
 for(const effect of ['coffee-steam','cold-breath','door-fog','sleeve-dust','wet-footprints'])assert(fs.existsSync(path.join(root,'assets/effects',effect+'.png')));
});
test('PWA icons and local entrypoints exist',()=>{const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));for(const icon of manifest.icons)assert(fs.existsSync(path.join(root,icon.src)));assert.equal(manifest.display,'standalone');});
test('pause and saved result controls cannot strand the player behind a dismissed receipt',()=>{assert(app.includes("if(['summary','fired','dark','win'].includes(model.s.phase))"));assert(app.includes("if(!menu&&wasHidden)requestAnimationFrame(()=>engine.scale.refresh())"));assert(app.includes("if(model.s.phase==='menu'){const previous=readSave()"));});
