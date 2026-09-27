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

test('Train and Starship art use pinned, separately licensed source collections',()=>{
 const record=JSON.parse(fs.readFileSync(path.join(base,'world-art-sources.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(__dirname,'../../tools/artwork/package-lock.json'),'utf8'));
 assert.equal(record.version,lock.packages['node_modules/@dicebear/styles'].version);
 assert.equal(sha(fs.readFileSync(path.join(base,record.output))),record.outputSha256);
 assert.deepEqual(record.collections.map(x=>[x.world,x.style]),[['train','landscape'],['starship','planets']]);
 for(const collection of record.collections){
  assert.equal(collection.license.name,'CC0 1.0');assert.match(collection.definitionSha256,/^[a-f0-9]{64}$/);
  assert.ok(collection.selections.every(x=>x.component!=='animation'));
 }
 assert.deepEqual(record.collections[1].selections.map(x=>x.variant),['terra','cratered','banded','soft'],'Earth and Jupiter must not acquire decorative Saturn rings');
});

test('curated journey geometry is bounded, inert, and resolves all local SVG references',async()=>{
 const {WORLD_ART}=await import('../extension/living/art/world-art.mjs');
 const tags=new Set(['g','path','circle','ellipse','rect','defs','clipPath','radialGradient','stop']);
 const attrsAllowed=new Set(['d','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','transform','clip-path','id','fill-rule','cx','cy','r','rx','ry','x','y','width','height','fill-opacity','stroke-opacity','gradientUnits','offset','stop-color','stop-opacity']);
 const ids=new Set(),refs=[];let count=0;
 function walk([tag,attrs,children]){
  count++;assert.ok(tags.has(tag),tag);
  for(const[key,value]of Object.entries(attrs)){
   assert.ok(attrsAllowed.has(key),key);assert.equal(typeof value,'string');
   assert.doesNotMatch(value,/(?:https?:|javascript:|data:|[<>])/);
   if(key==='id'){assert.ok(!ids.has(value),value);ids.add(value);}
   for(const match of value.matchAll(/url\(#([^)]*)\)/g))refs.push(match[1]);
  }
  for(const child of children)walk(child);
 }
 for(const art of Object.values(WORLD_ART))for(const nodes of Object.values(art))for(const node of nodes)walk(node);
 assert.ok(count<=50,`Curated journey SVG node count: ${count}`);
 for(const id of refs)assert.ok(ids.has(id),`Unresolved SVG reference ${id}`);
});

test('journey assembly preserves motion containers, stage hooks and original foregrounds',async()=>{
 const {addTrainLandscape,addStarshipSurfaces}=await import('../extension/living/art/journey-art.mjs');
 class Element{
  constructor(tag,attrs={}){this.localName=tag;this.attrs={...attrs};this.children=[];}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  replaceWith(node){const i=this.parent.children.indexOf(this);node.parent=this.parent;this.parent.children.splice(i,1,node);}
  remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
  after(node){const i=this.parent.children.indexOf(this);node.parent=this.parent;this.parent.children.splice(i+1,0,node);}
  querySelectorAll(s){return s===':scope > path'?this.children.filter(x=>x.localName==='path'):[];}
 }
 const doc={createElementNS:(ns,tag)=>{assert.equal(ns,'http://www.w3.org/2000/svg');return new Element(tag);}};
 const landscape=new Element('g',{class:'landscape-move'}),cottage=new Element('path',{d:'original cottage'}),tree=new Element('path',{d:'original tree'});
 landscape.append(new Element('path',{fill:'var(--grass)'}),new Element('path',{fill:'var(--field)'}),tree,cottage);
 const root={querySelector:s=>s==='[data-layer="landscape"]'?landscape:null};
 const room={dataset:{},querySelector:s=>s===':scope > svg'?root:null};
 const layers=addTrainLandscape(doc,room);
 assert.equal(room.dataset.artwork,'train-landscape-v1');assert.equal(landscape.attrs.class,'landscape-move');
 assert.deepEqual(landscape.children,[layers,tree,cottage]);assert.equal(layers.children.length,3);
 const planet=new Element('g'),surface=new Element('g',{'clip-path':'url(#cd-planet)'}),asteroids=new Element('g',{class:'asteroids'}),disc=new Element('circle',{class:'planet-disc'});
 surface.append(new Element('path',{class:'continents'}));planet.append(disc,surface,asteroids);
 planet.querySelector=s=>s==='g[clip-path="url(#cd-planet)"]'?surface:null;
 root.querySelector=s=>s==='[data-layer="planet"]'?planet:null;
 assert.equal(addStarshipSurfaces(doc,room),surface);assert.equal(room.dataset.artwork,'starship-orbit-v1');
 assert.equal(planet.children[0],disc);assert.equal(planet.children.at(-1),asteroids);
 assert.deepEqual(surface.children.map(x=>x.attrs['data-art-surface']),['earth','moon','jupiter']);
 assert.equal(planet.children[2].attrs['data-art-prop'],'planet-shade');
 assert.equal(addTrainLandscape(doc,{querySelector:()=>null}),undefined);
 assert.equal(addStarshipSurfaces(doc,{querySelector:()=>null}),undefined);
});
