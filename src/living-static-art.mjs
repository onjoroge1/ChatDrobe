import {createCatRig} from '../browser-extension/extension/living/companion-rig.mjs';
import {createSvgArt} from '../browser-extension/extension/living/art/svg-art.mjs';
import {TOKYO_PLANT_ART} from '../browser-extension/extension/living/art/tokyo-plant-art.mjs';
import {WORLD_ART} from '../browser-extension/extension/living/art/world-art.mjs';
import {INTERIOR_ART} from '../browser-extension/extension/living/art/interior-art.mjs';

// Build-time only: serialize checked-in artwork through the same constructors as
// the extension. This is deliberately not an SVG upload parser or a browser DOM.
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number='-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
class SvgNode {
 constructor(tag){this.tag=tag;this.attrs={};this.style={};this.children=[];this.parent=null;}
 setAttribute(name,value){this.attrs[name]=String(value);}
 append(...children){for(const child of children){if(child.parent)child.parent.children.splice(child.parent.children.indexOf(child),1);child.parent=this;this.children.push(child);}}
}
const document={createElementNS(ns,tag){if(ns!=='http://www.w3.org/2000/svg')throw new Error('Expected local SVG artwork.');return new SvgNode(tag);}};
function transform(value,origin='0px 0px'){
 let result='',at=0;
 for(const match of value.matchAll(/(translate|rotate|scale|scaleY)\(([^)]*)\)/g)){
  if(value.slice(at,match.index).trim())throw new Error('Unsupported static artwork transform.');
  const values=match[2].split(',').map(v=>v.trim()),fn=match[1],suffix=fn==='translate'?'px':fn==='rotate'?'deg':'';
  if(values.length!==(fn==='translate'||fn==='scale'?2:1)||values.some(v=>!new RegExp(`^${number}${suffix}$`).test(v)))throw new Error('Invalid static artwork transform.');
  const args=values.map(v=>Number(suffix?v.slice(0,-suffix.length):v));
  result+=fn==='scaleY'?`scale(1 ${args[0]}) `:`${fn}(${args.join(' ')}) `;at=match.index+match[0].length;
 }
 if(!result||value.slice(at).trim())throw new Error('Unsupported static artwork transform.');
 const pivot=origin.split(' ').map(v=>{if(!new RegExp(`^${number}px$`).test(v))throw new Error('Invalid static artwork origin.');return Number(v.slice(0,-2));});
 if(pivot.length!==2)throw new Error('Invalid static artwork origin.');
 return pivot.some(Boolean)?`translate(${pivot.join(' ')}) ${result}translate(${-pivot[0]} ${-pivot[1]})`:result.trim();
}
function serialize(node,prefix){
 const attrs={...node.attrs};
 for(const[name,value]of Object.entries(node.style)){
  if(name==='transform')attrs.transform=transform(value,node.style.transformOrigin);
  else if(name==='opacity')attrs.opacity=value;
  else if(name==='d'){
   const match=/^path\("([^"<>]+)"\)$/.exec(value);if(!match)throw new Error('Invalid static artwork path.');attrs.d=match[1];
  }else if(name!=='transformOrigin'&&name!=='transformBox')throw new Error('Unsupported static artwork style.');
 }
 const attributes=Object.entries(attrs).map(([name,value])=>{
  value=String(value).replaceAll(/url\(#([^)]*)\)/g,(_,id)=>`url(#${prefix}-${id})`);if(name==='id')value=`${prefix}-${value}`;
  return ` ${name}="${escape(value)}"`;
 }).join('');
 return `<${node.tag}${attributes}>${node.children.map(child=>serialize(child,prefix)).join('')}</${node.tag}>`;
}
function prefix(instance){if(!/^[-a-z0-9]+$/.test(instance))throw new Error('Invalid static artwork instance.');return `env-art-${instance}`;}
const cat=createCatRig(document).element; // Constructor applies the canonical rest pose; never calls play().
export function staticCatArt(instance){return `<g data-artwork="canonical-cat" transform="translate(682 444) scale(.85)">${cat.children.map(node=>serialize(node,prefix(instance))).join('')}</g>`;}
function art(spec,instance){return serialize(createSvgArt(document,spec),prefix(instance));}
export function staticWorldProps(id,instance){
 if(id==='tokyo')return art(['g',{'data-artwork':'dicebear-sprouts'},[
  ['g',{'data-art-prop':'window-palm',transform:'translate(815 354) scale(1.55)'},TOKYO_PLANT_ART['window-palm']],
  ['g',{'data-art-prop':'desk-sprout',transform:'translate(270 416) scale(1.2)'},TOKYO_PLANT_ART['desk-sprout']]
 ]],instance).replaceAll('var(--nook-leaf)','var(--env-grass)').replaceAll('var(--nook-pot)','#c49373');
 if(id==='train')return art(['g',{'data-artwork':'dicebear-landscape'},[
  ['g',{'data-art-prop':'distant-ridge',transform:'translate(0 297) scale(10 4)'},WORLD_ART.train['distant-ridge']],
  ['g',{'data-art-prop':'rolling-fields',transform:'translate(0 345) scale(10 4)'},WORLD_ART.train['rolling-fields']],
  ['g',{'data-art-prop':'near-meadow',transform:'translate(0 396) scale(10 3)'},WORLD_ART.train['near-meadow']]
 ]],instance).replaceAll('var(--far)','var(--env-city)').replaceAll('var(--grass)','var(--env-grass)').replaceAll('var(--field)','#759078');
 if(id==='starship')return art(['g',{'data-artwork':'dicebear-planets'},[
  ['g',{'data-art-surface':'earth',transform:'translate(647.2667 92.7) scale(3.4333)'},WORLD_ART.starship['earth-surface']],
  ['g',{'data-art-prop':'planet-shade',transform:'translate(661 103) scale(3.4333)'},WORLD_ART.starship['planet-shade']]
 ]],instance);
 throw new Error('Unknown static world artwork.');
}

export function staticInteriorArt(id,instance){
 const layers=INTERIOR_ART[id];if(!layers)throw new Error('Unknown static interior artwork.');
 return Object.entries(layers).map(([layer,nodes])=>art(['g',{'data-interior':id+'-'+layer},nodes],instance)).join('')
  .replaceAll(/var\(--(wood|frame|pane|wall)\)/g,(_,name)=>`var(--env-${name})`).replaceAll('var(--carriage-seat,#527674)','var(--env-carriage-seat)');
}
