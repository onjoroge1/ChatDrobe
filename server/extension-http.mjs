import {randomUUID} from 'node:crypto';
import {AccountError,validSecret,hash} from './accounts-policy.mjs';
import {BillingError} from './security.mjs';
import {privateHeaders} from './accounts-http.mjs';
import {bindDeviceLease} from './device-lease.mjs';
const known=new Set(['start','poll','entitlement','disconnect']);
function json(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));}
export function createExtensionHandler(runtime){return async(req,res)=>{
 privateHeaders(res);const requestId=randomUUID();
 try{
  const action=new URL(req.url,'https://extension.invalid').searchParams.get('action');if(!known.has(action))throw new AccountError('NOT_FOUND','Unknown extension action.',404);
  const origin=req.headers.origin;
  if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))throw new AccountError('ORIGIN','Use the installed ChatDrobe extension.',403);
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.statusCode=204;res.end();return;}
  if(req.method!=='POST')throw new AccountError('METHOD','Use POST.',405);
  const secret=/^Bearer ([A-Za-z0-9_-]+)$/.exec(req.headers.authorization||'')?.[1];if(!validSecret(secret))throw new AccountError('DEVICE_SIGN_IN_REQUIRED','A valid extension credential is required.',401);
  if((req.headers['content-type']||'').split(';')[0].toLowerCase()!=='application/json')throw new AccountError('CONTENT_TYPE','Send JSON.',415);
  if(Number(req.headers['content-length']||0)>1024)throw new AccountError('BODY_TOO_LARGE','Request too large.',413);
  let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>1024)throw new AccountError('BODY_TOO_LARGE','Request too large.',413);chunks.push(c);}
  let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new AccountError('INPUT','Invalid request.');}
  if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(k=>action!=='start'||k!=='extensionId'))throw new AccountError('INPUT','Unexpected extension request field.');
  const id=hash(secret),rt=await runtime();
  if(action==='start'){
   if(origin&&origin!=='chrome-extension://'+input.extensionId)throw new AccountError('ORIGIN','Extension origin does not match.',403);
   const ip=typeof req.headers['x-vercel-forwarded-for']==='string'?req.headers['x-vercel-forwarded-for'].slice(0,128):req.socket?.remoteAddress||'unknown';
   const result=await rt.devices.start(id,input.extensionId,ip);json(res,200,{...result,verificationUrl:rt.web.origin+'/account/#link='+encodeURIComponent(result.code)});return;
  }
  if(action==='disconnect'){await rt.devices.disconnect(id);json(res,200,{ok:true});return;}
  if(action==='poll'){json(res,200,await rt.devices.poll(id));return;}
  const device=await rt.devices.device(id),dependencies=await rt.payments.dependencies();
  if(!dependencies.config.enabled){json(res,200,{linked:true,account:{email:device.email},plan:'free',environment:'test',billingEnabled:false,token:null});return;}
  const result=await dependencies.service.refresh(device.billing_id);
  await rt.devices.device(id);
  const lease=bindDeviceLease(dependencies.config,result,id);
  await rt.pool.query('UPDATE public.chatdrobe_extension_devices SET last_seen=now() WHERE credential_hash=$1',[id]);
  json(res,200,{...lease,linked:true,account:{email:device.email},billingEnabled:true,cancelAtPeriodEnd:result.cancelAtPeriodEnd});
 }catch(e){const handled=e instanceof AccountError||e instanceof BillingError;if(!handled)console.error('extension access failed',requestId);json(res,handled?e.status:503,{error:{code:handled?e.code:'UNAVAILABLE',message:handled?e.message:'Extension account service is temporarily unavailable.',requestId}});}
};}
