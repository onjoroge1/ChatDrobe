import {WORLD_ART} from './world-art.mjs';
import {createSvgArt,compactCityWindows} from './svg-art.mjs';

export function addTrainLandscape(doc,room){
 const root=room.querySelector(':scope > svg'),landscape=root?.querySelector('[data-layer="landscape"]');
 if(!root||!landscape)return;
 const old=[...landscape.querySelectorAll(':scope > path')];
 if(old[0]?.getAttribute('fill')!=='var(--grass)'||old[1]?.getAttribute('fill')!=='var(--field)')return;
 const layers=createSvgArt(doc,['g',{'data-artwork':'dicebear-landscape','aria-hidden':'true'},[
  ['g',{'data-art-prop':'distant-ridge',transform:'translate(0 297) scale(10 4)'},WORLD_ART.train['distant-ridge']],
  ['g',{'data-art-prop':'rolling-fields',transform:'translate(0 345) scale(10 4)'},WORLD_ART.train['rolling-fields']],
  ['g',{'data-art-prop':'near-meadow',transform:'translate(0 396) scale(10 3)'},WORLD_ART.train['near-meadow']]
 ]]);
 // Retain cottage/trees and the existing landscape animation; only replace hills.
 old[0].replaceWith(layers);old[1].remove();
 compactCityWindows(doc,root);
 room.dataset.artwork='train-landscape-v1';
 return layers;
}

export function addStarshipSurfaces(doc,room){
 const root=room.querySelector(':scope > svg'),planet=root?.querySelector('[data-layer="planet"]');
 const surface=planet?.querySelector('g[clip-path="url(#cd-planet)"]');
 if(!surface)return;
 const create=spec=>createSvgArt(doc,spec);
 // DiceBear's surface is centered at (34,33), its shade at (30,30).
 // Fit both to the existing center (735,184), radius 99, without replacing stages.
 surface.replaceChildren(...[
  ['earth','earth-surface','continents planet-turn'],
  ['moon','moon-surface','moon-craters'],
  ['jupiter','jupiter-surface','jupiter-bands']
 ].map(([stage,id,className])=>create(['g',{'data-art-surface':stage,class:className},[
  ['g',{transform:'translate(622.8 75.1) scale(3.3)'},WORLD_ART.starship[id]]
 ]])));
 const shade=create(['g',{'data-art-prop':'planet-shade',transform:'translate(636 85) scale(3.3)'},WORLD_ART.starship['planet-shade']]);
 // Shade follows the disc. Existing asteroid layer and deep-space opacity remain.
 surface.after(shade);
 room.dataset.artwork='starship-orbit-v1';
 return surface;
}
