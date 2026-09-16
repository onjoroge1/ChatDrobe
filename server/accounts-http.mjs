import {randomUUID} from 'node:crypto';
import {AccountError,COOKIE,CHALLENGE_COOKIE,CODE_SECONDS,cookieValue,setCookie,requireOrigin,webConfig} from './accounts-policy.mjs';
const READ=new Set(['status','me','admin-setup']),WRITE=new Set(['request-code','verify-code','signout','signout-all','admin-activate','admin-users']);
export function privateHeaders(res){for(const[k,v]of Object.entries({'Cache-Control':'no-store, private','Vercel-CDN-Cache-Control':'no-store','CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}))res.setHeader(k,v);}
function json(res,status,result){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(result));}
async function body(req){
 if((req.headers['content-type']||'').split(';')[0].toLowerCase()!=='application/json')throw new AccountError('CONTENT_TYPE','Send JSON.',415);
 if(Number(req.headers['content-length']||0)>2048)throw new AccountError('BODY_TOO_LARGE','Request too large.',413);
 let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>2048)throw new AccountError('BODY_TOO_LARGE','Request too large.',413);chunks.push(chunk);}
 let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new AccountError('JSON','Invalid request.');}if(!data||Array.isArray(data)||typeof data!=='object')throw new AccountError('INPUT','Invalid request.');return data;
}
function shape(value,keys){if(Object.keys(value).some(k=>!keys.includes(k)))throw new AccountError('INPUT','Unexpected request field.');}
export function createAccountHandler(getRuntime,{config=()=>webConfig()}={}){return async(req,res)=>{
 privateHeaders(res);const requestId=randomUUID();
 try{
  const url=new URL(req.url,'https://account.invalid'),action=url.searchParams.get('action');
  if((READ.has(action)&&req.method!=='GET')||(WRITE.has(action)&&req.method!=='POST'))throw new AccountError('METHOD','Method not allowed.',405);
  if(!READ.has(action)&&!WRITE.has(action))throw new AccountError('NOT_FOUND','Unknown account action.',404);
  const web=config();if(req.method==='POST')requireOrigin(req,web);
  if(action==='status'){json(res,200,{signInAvailable:web.emailReady,method:'email_code',livePayments:false});return;}
  const sessionToken=cookieValue(req.headers.cookie,COOKIE);
  if(!['request-code','verify-code','signout'].includes(action)&&!sessionToken)throw new AccountError('SIGN_IN_REQUIRED','Sign into your ChatDrobe account.',401);
  const ip=typeof req.headers['x-vercel-forwarded-for']==='string'?req.headers['x-vercel-forwarded-for'].slice(0,128):req.socket?.remoteAddress||'unknown';
  const rt=await getRuntime();
  if(action==='request-code'){const input=await body(req);shape(input,['email','mode','acceptBeta']);const previous=cookieValue(req.headers.cookie,CHALLENGE_COOKIE);const result=await rt.service.requestCode(input,{ip,previous});res.setHeader('Set-Cookie',setCookie(CHALLENGE_COOKIE,result.nonce,CODE_SECONDS,web));json(res,202,result.public);return;}
  if(action==='verify-code'){const input=await body(req);shape(input,['code']);const result=await rt.service.verifyCode(cookieValue(req.headers.cookie,CHALLENGE_COOKIE),input.code,{ip});res.setHeader('Set-Cookie',[setCookie(COOKIE,result.token,result.seconds,web),setCookie(CHALLENGE_COOKIE,'',0,web)]);json(res,200,{user:result.user});return;}
  const token=sessionToken;
  if(action==='signout'){shape(await body(req),[]);await rt.service.signout(token);res.setHeader('Set-Cookie',[setCookie(COOKIE,'',0,web),setCookie(CHALLENGE_COOKIE,'',0,web)]);json(res,200,{ok:true});return;}
  const user=await rt.service.authenticate(token);
  if(action==='me'){json(res,200,await rt.service.profile(user));return;}
  if(action==='signout-all'){shape(await body(req),[]);await rt.service.signoutAll(user);res.setHeader('Set-Cookie',setCookie(COOKIE,'',0,web));json(res,200,{ok:true});return;}
  if(action==='admin-users'){const input=await body(req);shape(input,['q','plan','page']);json(res,200,await rt.service.admin(user,{q:input.q||'',plan:input.plan||'all',page:input.page||1}));return;}
  if(action==='admin-setup'){json(res,200,await rt.service.setup(user));return;}
  if(action==='admin-activate'){const input=await body(req);shape(input,['enabled']);if(typeof input.enabled!=='boolean')throw new AccountError('INPUT','Choose enable or disable.');json(res,200,await rt.service.activate(user,input.enabled));return;}
 }catch(e){const known=e instanceof AccountError||['RATE_LIMIT','SIGN_IN_REQUIRED','BILLING_DISABLED'].includes(e.code);if(!known)console.error('account request failed',requestId);json(res,known?e.status||503:503,{error:{code:known?e.code:'UNAVAILABLE',message:known?e.message:'Account service is temporarily unavailable.',requestId}});}
};}
