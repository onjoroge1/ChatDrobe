import fs from 'node:fs';
import path from 'node:path';
import {SCENE_CSS} from '../src/living-runtime/scene.mjs';
/** Publish the v0.5.1 renderer without the page adapter, timer worker, or duplicate CSS string. */
export function writeLivingAssets(root,assets){
 const source=fs.readFileSync(path.join(root,'src/living-runtime/scene.mjs'),'utf8');
 const start=source.indexOf('export const SCENE_CSS=`'),end=source.indexOf('export function createScene');
 if(start<0||end<=start)throw new Error('Review the changed scene module before bundling.');
 const renderer=(source.slice(0,start)+source.slice(end)).replace("from './model.mjs'","from './living-model.js'");
 fs.mkdirSync(assets,{recursive:true});
 fs.writeFileSync(path.join(assets,'living-renderer.js'),renderer);
 fs.copyFileSync(path.join(root,'src/living-runtime/model.mjs'),path.join(assets,'living-model.js'));
 fs.copyFileSync(path.join(root,'src/living-tour.mjs'),path.join(assets,'living-tour.js'));
 // An external Shadow DOM stylesheet keeps the existing no-inline-script/style policy intact.
 fs.writeFileSync(path.join(assets,'living-runtime.css'),SCENE_CSS+'\n.caption{display:none}.room{border-radius:inherit}\n');
}
