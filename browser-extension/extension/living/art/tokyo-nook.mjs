import {TOKYO_PLANT_ART} from './tokyo-plant-art.mjs';

// Only our checked-in, build-time curated geometry reaches this renderer.
// IDs are unique per prop and isolated with the world inside a ShadowRoot.
export function addTokyoNook(doc,room){
 const root=room.querySelector(':scope > svg'),desk=root?.querySelector('[data-layer="desk"]');
 if(!root||!desk)return;
 const create=([tag,attrs,children=[]])=>{const node=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,value);node.append(...children.map(create));return node;};
 // These 72 same-color window rectangles share one lighting opacity. Preserve
 // their geometry, including rounded corners, in a single compound SVG path.
 // This makes room for the plants and pilot without increasing the scene budget.
 const lights=root.querySelector('[data-layer="city"] .windows');
 if(lights){
  const rectangles=[...lights.children];
  if(rectangles.length&&rectangles.every(node=>node.localName==='rect')){
   const d=rectangles.map(rect=>{
    const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y')),w=Number(rect.getAttribute('width')),h=Number(rect.getAttribute('height')),r=Number(rect.getAttribute('rx')||0);
    return `M${x+r} ${y}h${w-2*r}a${r} ${r} 0 0 1 ${r} ${r}v${h-2*r}a${r} ${r} 0 0 1 -${r} ${r}h-${w-2*r}a${r} ${r} 0 0 1 -${r} -${r}v-${h-2*r}a${r} ${r} 0 0 1 ${r} -${r}Z`;
   }).join('');
   lights.replaceChildren(create(['path',{d,'data-city-windows':String(rectangles.length)},[]]));
  }
 }
 const props=create(['g',{'data-artwork':'dicebear-sprouts','aria-hidden':'true'},[]]);
 for(const[id,x,y,scale]of [['window-palm',815,323,1.8],['desk-sprout',230,393,1.2]]){
  props.append(create(['g',{'data-art-prop':id,transform:`translate(${x} ${y}) scale(${scale})`},TOKYO_PLANT_ART[id]]));
 }
 // Mount before the desk mug/notebook so the plant leaves sit against the window,
 // and the original articulated companion remains in its independent safe habitat.
 desk.append(props);
 room.dataset.artwork='tokyo-nook-v1';
 return props;
}
