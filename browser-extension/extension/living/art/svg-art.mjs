const NS='http://www.w3.org/2000/svg';
// This accepts checked-in compiler output only, never uploads or remote SVG.
export function createSvgArt(doc,[tag,attrs,children=[]]){
 const node=doc.createElementNS(NS,tag);
 for(const[key,value]of Object.entries(attrs))node.setAttribute(key,value);
 node.append(...children.map(child=>createSvgArt(doc,child)));
 return node;
}
// Window lights share one paint and opacity. Merge their rounded rectangles into
// one compound path, preserving the silhouette while freeing decorative node budget.
export function compactCityWindows(doc,root){
 const lights=root.querySelector('[data-layer="city"] .windows');
 if(!lights)return;
 const rectangles=[...lights.children];
 if(!rectangles.length||!rectangles.every(node=>node.localName==='rect'))return;
 const d=rectangles.map(rect=>{
  const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y')),w=Number(rect.getAttribute('width')),h=Number(rect.getAttribute('height')),r=Number(rect.getAttribute('rx')||0);
  return `M${x+r} ${y}h${w-2*r}a${r} ${r} 0 0 1 ${r} ${r}v${h-2*r}a${r} ${r} 0 0 1 -${r} ${r}h-${w-2*r}a${r} ${r} 0 0 1 -${r} -${r}v-${h-2*r}a${r} ${r} 0 0 1 ${r} -${r}Z`;
 }).join('');
 lights.replaceChildren(createSvgArt(doc,['path',{d,'data-city-windows':String(rectangles.length)}]));
}
