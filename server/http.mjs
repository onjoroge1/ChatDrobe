import {randomUUID} from 'node:crypto';
import {BillingError,clock,installationId,verifyWebhook} from './security.mjs';
import {AccountError} from './accounts-policy.mjs';
async function rawBody(req,max){if(Number(req.headers['content-length']||0)>max)throw new BillingError('BODY_TOO_LARGE','Request body is too large.',413);let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw new BillingError('BODY_TOO_LARGE','Request body is too large.',413);chunks.push(chunk);}return Buffer.concat(chunks);}
function json(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));}
export function createHandler(dependencies,{databaseStatus,authenticate,checkoutGuard,billingStatus}={}){return async function handler(req,res){
 const requestId=randomUUID();for(const[k,v]of Object.entries({'Cache-Control':'no-store, private','Vercel-CDN-Cache-Control':'no-store','CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}))res.setHeader(k,v);
 try{
  const action=new URL(req.url,'https://billing.invalid').searchParams.get('action');
  if(action==='database'){if(req.method!=='GET')throw new BillingError('METHOD','Database readiness is read-only; use GET.',405);const status=databaseStatus?await databaseStatus():{configured:false,connected:false,schemaReady:false,status:'not_configured'};json(res,status.schemaReady?200:503,status);return;}
  if(action==='return'&&req.method==='GET'){res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to ChatDrobe</title><h1>Return to ChatDrobe</h1><p>This is a test billing flow. No live subscription was purchased.</p><p>Only verified payment status unlocks test access; visiting this page cannot.</p><p><a href="/account/">Open your account and refresh subscription</a>.</p></html>');return;}
  if(action==='health'&&req.method==='GET'&&billingStatus){json(res,200,await billingStatus());return;}
  const{config,service,store}=await dependencies();if(action==='health'&&req.method==='GET'){json(res,200,{enabled:config.enabled,mode:config.enabled?'test':'off',livePayments:false});return;}
  if(!config.enabled)throw new BillingError('BILLING_DISABLED','Test billing is not configured. No payment will be collected.',503);
  const origin=req.headers.origin,siteAllowed=authenticate&&origin===config.origin;
  if(origin&&!siteAllowed&&!config.extensionIds.some(id=>origin===`chrome-extension://${id}`))throw new BillingError('ORIGIN','Origin not permitted.',403);
  if(origin&&!siteAllowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.statusCode=204;res.end();return;}
  if(req.method!=='POST')throw new BillingError('METHOD','Use POST for billing actions.',405);
  if(action==='webhook'){const event=verifyWebhook(await rawBody(req,262144),req.headers['stripe-signature'],config.webhookSecret);json(res,200,await service.webhook(event));return;}
  if(!['checkout','entitlement','portal'].includes(action))throw new BillingError('NOT_FOUND','Unknown billing action.',404);
  const id=authenticate?await authenticate(req):installationId(req.headers.authorization);
  await store.limit('api-global',600,60,clock());await store.limit('api:'+id,30,60,clock());
  if((req.headers['content-type']||'').split(';')[0].toLowerCase()!=='application/json')throw new BillingError('CONTENT_TYPE','Send application/json.',415);
  const raw=await rawBody(req,2048);let input;try{input=raw.length?JSON.parse(raw.toString('utf8')):{};}catch{throw new BillingError('JSON','Invalid JSON.');}
  if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(k=>action!=='checkout'||k!=='world'))throw new BillingError('INPUT','Only the selected world may be supplied for checkout.');
  if(action==='checkout'&&checkoutGuard)await checkoutGuard();
  json(res,200,action==='checkout'?await service.checkout(id,input.world):action==='portal'?await service.portal(id):await service.refresh(id));
 }catch(error){const known=error instanceof BillingError||error instanceof AccountError;if(!known)console.error('billing request failed',requestId);json(res,known?error.status:503,{error:{code:known?error.code:'UNAVAILABLE',message:known?error.message:'Billing is temporarily unavailable. Please retry.',requestId}});}
};}
