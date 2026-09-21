const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.join(__dirname,'../extension/living/art');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
test('bundled artwork matches pinned source provenance and its exported checksum',()=>{
 const record=JSON.parse(fs.readFileSync(path.join(base,'art-sources.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(__dirname,'../../tools/artwork/package-lock.json'),'utf8'));
 assert.equal(record.package,'@dicebear/styles');assert.equal(record.version,'10.6.0');assert.equal(record.license.name,'CC0 1.0');
 assert.equal(record.version,lock.packages['node_modules/@dicebear/styles'].version);
 assert.equal(sha(fs.readFileSync(path.join(base,record.output))),record.outputSha256);
 assert.match(record.definitionSha256,/^[a-f0-9]{64}$/);
 assert.match(fs.readFileSync(path.join(base,'ARTWORK-LICENSE.txt'),'utf8'),/Sprouts by DiceBear/);
});
test('curated artwork is bounded inert SVG with distinct resolvable local references',async()=>{
 const {TOKYO_PLANT_ART}=await import('../extension/living/art/tokyo-plant-art.mjs');
 const tags=new Set(['g','path','circle','ellipse','rect','defs','clipPath']);
 const ids=new Set(),refs=[];let count=0;
 function walk([tag,attrs,children]){
  count++;assert.ok(tags.has(tag),tag);
  for(const[key,value]of Object.entries(attrs)){
   assert.doesNotMatch(key,/^(?:on|href|style|class)/i);assert.equal(typeof value,'string');
   assert.doesNotMatch(value,/(?:https?:|javascript:|data:|[<>])/);
   if(key==='id'){assert.ok(!ids.has(value),value);ids.add(value);}
   for(const match of value.matchAll(/url\(#([^)]*)\)/g))refs.push(match[1]);
  }
  for(const child of children)walk(child);
 }
 assert.deepEqual(Object.keys(TOKYO_PLANT_ART),['window-palm','desk-sprout']);
 for(const nodes of Object.values(TOKYO_PLANT_ART))for(const node of nodes)walk(node);
 assert.ok(count<=40,`Curated SVG node count: ${count}`);
 for(const id of refs)assert.ok(ids.has(id),`Unresolved SVG reference ${id}`);
});
test('Tokyo prop assembly uses the bundled geometry while other scenes stay untouched',async()=>{
 const {addTokyoNook}=await import('../extension/living/art/tokyo-nook.mjs');
 function element(tag){return{tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},append(...children){this.children.push(...children);}};}
 const desk=element('g'),svg={querySelector:s=>s==='[data-layer="desk"]'?desk:null};
 const room={dataset:{},querySelector:s=>s===':scope > svg'?svg:null};
 const doc={createElementNS:(ns,tag)=>{assert.equal(ns,'http://www.w3.org/2000/svg');return element(tag);}};
 const props=addTokyoNook(doc,room);
 assert.equal(desk.children[0],props);assert.equal(room.dataset.artwork,'tokyo-nook-v1');
 assert.equal(props.children.length,2);assert.deepEqual(props.children.map(x=>x.attrs['data-art-prop']),['window-palm','desk-sprout']);
 assert.equal(addTokyoNook(doc,{querySelector:()=>null}),undefined);
});
