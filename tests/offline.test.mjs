import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {normaliseSettings,Diner} from '../dist/sim.js';
const root=new URL('../dist/',import.meta.url);
test('offline precache includes every required local file',()=>{
 const c={self:{}};vm.runInNewContext(fs.readFileSync(new URL('precache.js',root),'utf8'),c);
 assert(c.self.F033_ASSETS.length>90);for(const path of c.self.F033_ASSETS)assert(fs.existsSync(new URL(path,root)),path);
});
test('cached audio range responses support offline playback',async()=>{
 const ctx={self:{addEventListener(){},location:{origin:'https://example.test'}},importScripts(){},Response,Number,Math};
 vm.runInNewContext(fs.readFileSync(new URL('sw.js',root),'utf8'),ctx);
 const full=()=>new Response('0123456789',{headers:{'Content-Type':'audio/ogg'}});
 const r=await ctx.rangedResponse(full(),'bytes=2-5');assert.equal(r.status,206);assert.equal(await r.text(),'2345');assert.equal(r.headers.get('Content-Range'),'bytes 2-5/10');
 const suffix=await ctx.rangedResponse(full(),'bytes=-3');assert.equal(await suffix.text(),'789');
 const invalid=await ctx.rangedResponse(full(),'bytes=20-');assert.equal(invalid.status,416);
});
test('invalid settings cannot crash audio volume',()=>{
 assert.equal(normaliseSettings({volume:900}).volume,1);assert.equal(normaliseSettings({volume:-1}).volume,0);
 assert.equal(normaliseSettings({volume:'bad'}).volume,.55);assert.equal(normaliseSettings({flickerOff:'false'}).flickerOff,true);
});
test('endless rent loans reset at the next week boundary',()=>{
 const get=n=>JSON.parse(fs.readFileSync(new URL('assets/data/'+n+'.json',root)));
 const g=new Diner({creatures:get('creatures'),regulars:get('regulars'),recipes:get('recipes'),tells:get('tells'),actions:get('inspection-actions'),dialogue:get('dialogue-180'),humanTalk:get('human-small-talk')});
 g.progress.mode='endless';g.progress.night=7;g.progress.cash=0;g.startNight();g.close();assert.equal(g.progress.loans,1);g.nextNight();assert.equal(g.progress.night,8);assert.equal(g.progress.loans,0);
});
