import {createExtensionHandler} from '../server/extension-http.mjs';
import {accountRuntime} from '../server/accounts-runtime.mjs';
import {privateHeaders} from '../server/accounts-http.mjs';
import {signingReadiness} from '../server/signing-key.mjs';
export const config={api:{bodyParser:false}};
const handle=createExtensionHandler(accountRuntime);
export default function handler(req,res){
 if(new URL(req.url,'https://extension.invalid').searchParams.get('action')==='health'){
  privateHeaders(res);res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({error:{code:'METHOD',message:'Read-only readiness check; use GET.'}}));return;}
  // Reports only public release configuration. This endpoint never authenticates or grants access.
  res.statusCode=200;res.end(JSON.stringify({service:'extension-access',signing:signingReadiness(),livePayments:false}));return;
 }
 return handle(req,res);
}
