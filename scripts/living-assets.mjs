import fs from 'node:fs';
import path from 'node:path';
import {SCENE_CSS} from '../browser-extension/extension/living/quiet-scene.mjs';

/** Publish only the shared scene vocabulary; the page adapter and access worker stay in the extension. */
export function writeLivingAssets(root,assets){
 const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
 const sourceRoot=path.join(root,release.extension.source,'living');
 const read=name=>fs.readFileSync(path.join(sourceRoot,name),'utf8');
 const base=read('scene.mjs'),start=base.indexOf('export const SCENE_CSS=`'),end=base.indexOf('export function createScene');
 if(start<0||end<=start)throw new Error('Review the changed scene module before bundling.');
 const baseRenderer=(base.slice(0,start)+base.slice(end)).replace("from './model.mjs'","from './living-model.js'");
 const quiet=read('quiet-scene.mjs'),quietStart=quiet.indexOf('export const QUIET_CSS=`'),quietEnd=quiet.indexOf("const DETAIL_NS=");
 if(quietStart<0||quietEnd<=quietStart)throw new Error('Review the changed quiet-scene module before bundling.');
 const renderer=(quiet.slice(0,quietStart)+quiet.slice(quietEnd))
  .replace("import {createScene as baseScene,SCENE_CSS as BASE_CSS} from './scene.mjs';","import {createScene as baseScene} from './living-base.js';")
  .replaceAll("'./companion-rig.mjs'","'./living-companion-rig.js'")
  .replaceAll("'./companion-motion.mjs'","'./living-companion-motion.js'")
  .replaceAll("'./lottie-pilot.mjs'","'./living-lottie-pilot.js'")
  .replaceAll("'./art/","'./living-art/");
 fs.mkdirSync(assets,{recursive:true});
 for(const[name,source]of Object.entries({
  'living-base.js':baseRenderer,
  'living-renderer.js':renderer,
  'living-model.js':read('model.mjs'),
  'living-companion-rig.js':read('companion-rig.mjs').replaceAll("'./companion-motion.mjs'","'./living-companion-motion.js'"),
  'living-companion-motion.js':read('companion-motion.mjs'),
  'living-lottie-pilot.js':read('lottie-pilot.mjs').replaceAll("'./art/","'./living-art/").replaceAll("'./vendor/","'./living-vendor/")
 }))fs.writeFileSync(path.join(assets,name),source);
 for(const dir of ['art','vendor'])fs.cpSync(path.join(sourceRoot,dir),path.join(assets,'living-'+dir),{recursive:true});
 fs.copyFileSync(path.join(root,'src/living-tour.mjs'),path.join(assets,'living-tour.js'));
 // The stylesheet is external to preserve the website's no-inline-style policy.
 fs.writeFileSync(path.join(assets,'living-runtime.css'),SCENE_CSS+'\n.caption{display:none}.room{border-radius:inherit}\n');
}
