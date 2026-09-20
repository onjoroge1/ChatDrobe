import {createHash, randomBytes, randomInt, timingSafeEqual} from 'node:crypto';
export class AccountError extends Error {constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
export const CANONICAL_ORIGIN='https://www.chatdrobe.com';
// Remember the account, not a premium boolean. Administrative operations still require fresh authentication.
export const CODE_SECONDS=600,SESSION_SECONDS=2592000,ADMIN_SESSION_SECONDS=2592000,ADMIN_FRESH_SECONDS=900;
export const COOKIE='__Host-chatdrobe_session',CHALLENGE_COOKIE='__Host-chatdrobe_login';
export const hash=v=>createHash('sha256').update(v).digest('hex');
export const secret=()=>randomBytes(32).toString('base64url');
export const freshCode=()=>String(randomInt(100000000)).padStart(8,'0');
export const codeDigest=(nonce,code)=>hash('chatdrobe-otp-v1\0'+nonce+'\0'+code);
export const billingId=id=>hash('chatdrobe-account-v1\0'+id);
export function sameHash(a,b){return /^[a-f0-9]{64}$/.test(a||'')&&/^[a-f0-9]{64}$/.test(b||'')&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
export function validSecret(v){return typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v)&&Buffer.from(v,'base64url').length===32&&Buffer.from(v,'base64url').toString('base64url')===v;}
export function email(value){
 if(typeof value!=='string'||value.length>254)throw new AccountError('EMAIL','Enter a valid email address.');
 const normalized=value.trim().toLowerCase();
 if(!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(normalized)||normalized.split('@')[0].length>64||normalized.includes('..'))throw new AccountError('EMAIL','Enter a valid email address.');
 return normalized;
}
export function webConfig(env=process.env){
 const origin=env.AUTH_ORIGIN||CANONICAL_ORIGIN;let u;try{u=new URL(origin);}catch{throw new AccountError('CONFIGURATION','Account service is not configured.',503);}
 const local=!env.VERCEL&&env.AUTH_ALLOW_LOCALHOST==='true'&&['localhost','127.0.0.1'].includes(u.hostname);
 if((u.protocol!=='https:'&&!(local&&u.protocol==='http:'))||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new AccountError('CONFIGURATION','Account service is not configured.',503);
 const sender=env.AUTH_EMAIL_FROM||'',key=env.RESEND_API_KEY||'';
 const emailReady=/^re_[A-Za-z0-9_-]{16,}$/.test(key)&&/^[^\r\n<>]{1,120} <[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)*chatdrobe\.com>$/.test(sender);
 return {origin:u.origin,secure:!local,emailReady,emailKey:key,emailFrom:sender};
}
export function cookieValue(header,name){if(typeof header!=='string'||header.length>8192)return null;const matches=header.split(';').map(p=>p.trim()).filter(p=>p.startsWith(name+'='));if(matches.length!==1)return null;const value=matches[0].slice(name.length+1);return validSecret(value)?value:null;}
export function setCookie(name,value,maxAge,{secure=true}={}){return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export function requireOrigin(req,config){if(req.headers.origin!==config.origin||req.headers['sec-fetch-site']==='cross-site'||req.headers['x-chatdrobe-request']!=='account-v1')throw new AccountError('ORIGIN','Use the ChatDrobe website for this action.',403);}
export function requireAdmin(user,{fresh=false,now=Math.floor(Date.now()/1000)}={}){
 if(!user||user.role!=='admin'||!user.verifiedAt||user.disabledAt)throw new AccountError('FORBIDDEN','Administrator access required.',403);
 if(fresh&&(!Number.isSafeInteger(user.authenticatedAt)||user.authenticatedAt<=0||user.authenticatedAt>now+30||now-user.authenticatedAt>ADMIN_FRESH_SECONDS))throw new AccountError('REAUTHENTICATE','Sign in again for administrative operations. Your remembered account and linked Premium access are unchanged.',401);
}
export function safeUser(user){return {id:user.id,email:user.email,role:user.role,verified:!!user.verifiedAt,createdAt:user.createdAt,lastLoginAt:user.lastLoginAt};}
export function subscriptionSummary(state={},now=Math.floor(Date.now()/1000)){
 const active=state.status==='active'&&Number.isSafeInteger(state.paidUntil)&&state.paidUntil>now&&!state.hold;
 return {plan:active?'test_plus':'free',environment:'test',status:state.hold?'review_required':state.status||'free',paidUntil:active?state.paidUntil:null,cancelAtPeriodEnd:state.cancelAtPeriodEnd===true,lastVerifiedAt:Number.isSafeInteger(state.verifiedAt)?state.verifiedAt:null};
}
