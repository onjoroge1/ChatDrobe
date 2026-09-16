import fs from 'node:fs';
import path from 'node:path';
import {SCENE_CSS} from '../src/living-runtime/scene.mjs';
import {QUIET_CSS} from '../src/living-runtime/quiet-scene.mjs';
/** Keep the pinned base renderer; ship the v0.5.2 quiet refinement as a separate lazy module. */
export function writeLivingAssets(root,assets){
 const source=fs.readFileSync(path.join(root,'src/living-runtime/scene.mjs'),'utf8');
 const start=source.indexOf('export const SCENE_CSS=`'),end=source.indexOf('export function createScene');
 if(start<0||end<=start)throw new Error('Review the changed scene module before bundling.');
 const renderer=(source.slice(0,start)+source.slice(end)).replace("from './model.mjs'","from './living-model.js'");
 const quiet=fs.readFileSync(path.join(root,'src/living-runtime/quiet-scene.mjs'),'utf8');
 const qStart=quiet.indexOf('export const QUIET_CSS=`'),qEnd=quiet.indexOf("const QUIET_NS=");
 if(qStart<0||qEnd<=qStart)throw new Error('Review the quiet renderer before bundling.');
 const refinement=(quiet.slice(0,qStart)+quiet.slice(qEnd)).replace("import {createScene as baseScene,SCENE_CSS as BASE_CSS} from './scene.mjs';","import {createScene as baseScene} from './living-renderer.js';");
 fs.mkdirSync(assets,{recursive:true});
 fs.writeFileSync(path.join(assets,'living-renderer.js'),renderer);
 fs.writeFileSync(path.join(assets,'living-quiet.js'),refinement);
 fs.copyFileSync(path.join(root,'src/living-runtime/model.mjs'),path.join(assets,'living-model.js'));
 fs.copyFileSync(path.join(root,'src/living-tour.mjs'),path.join(assets,'living-tour.js'));
 // Import is same-origin and loads only with the opted-in scene. Original CSP stays intact.
 fs.writeFileSync(path.join(assets,'living-quiet.css'),QUIET_CSS);
 fs.writeFileSync(path.join(assets,'living-runtime.css'),"@import url('./living-quiet.css');\n"+SCENE_CSS+'\n.caption{display:none}.room{border-radius:inherit}\n');
}
