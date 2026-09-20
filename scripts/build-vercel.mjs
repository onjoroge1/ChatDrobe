import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildVercelOutput as baseBuild,deploymentRoutes as baseRoutes} from './build-vercel-base.mjs';
const PRIVATE_RUNTIME=['api/extension.js','server/owner-credentials.mjs','server/owner-access.mjs','server/extension-devices.mjs','server/device-lease.mjs','server/extension-http.mjs','server/premium-membership.mjs','server/signing-key.mjs'];
const extensionRoute={src:'^/api/extension/?$',dest:'/api/extension',headers:{'Cache-Control':'no-store, private','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store'}};
export function deploymentRoutes(manifest,config){const routes=baseRoutes(manifest,config);routes.splice(2,0,extensionRoute);return routes;}
export function buildVercelOutput(root,options={}){
 const result=baseBuild(root,options),functions=path.join(result.output,'functions/api');
 for(const target of ['billing','account'])for(const relative of PRIVATE_RUNTIME){const from=path.join(root,relative),to=path.join(functions,target+'.func',relative);if(!fs.lstatSync(from).isFile()||fs.lstatSync(from).isSymbolicLink())throw Error('Invalid access runtime file.');fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
 const extension=path.join(functions,'extension.func');fs.cpSync(path.join(functions,'account.func'),extension,{recursive:true});
 const configFile=path.join(extension,'.vc-config.json'),functionConfig=JSON.parse(fs.readFileSync(configFile,'utf8'));functionConfig.handler='api/extension.js';fs.writeFileSync(configFile,JSON.stringify(functionConfig,null,2)+'\n');
 const outputConfig=path.join(result.output,'config.json'),config=JSON.parse(fs.readFileSync(outputConfig,'utf8'));config.routes.splice(2,0,extensionRoute);fs.writeFileSync(outputConfig,JSON.stringify(config,null,2)+'\n');
 return {...result,functions:['/api/billing','/api/account','/api/extension']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const result=buildVercelOutput(path.dirname(path.dirname(fileURLToPath(import.meta.url))));console.log(`[deploy] Build Output API v3 at ${result.output}`);console.log(`[deploy] ${result.functions.join(', ')}; no secret or migration file copied into functions.`);}
