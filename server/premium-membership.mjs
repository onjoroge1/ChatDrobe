import {createPrivateKey,createPublicKey,createHash,sign,randomUUID} from 'node:crypto';
import {AccountError} from './accounts-policy.mjs';

export const REMEMBER_SECONDS=30*86400;
export const ACCESS_SECONDS=600;
/** These inputs come from authenticated server records, never request-body role flags. */
export function membership(user,subscription={}){
 if(!user||user.disabledAt||user.disabled_at)return {premium:false,source:'free',complimentary:false,label:'Free'};
 const admin=user.role==='admin';
 return {premium:admin||subscription.plan==='test_plus',source:admin?'admin':subscription.plan==='test_plus'?'stripe_test':'free',complimentary:admin,label:admin?'Admin Premium — complimentary':subscription.plan==='test_plus'?'Test Plus — verified subscription':'Free'};
}
/** Admin access needs the existing signing key, not a Stripe checkout or billing activation. */
export function accessSigningConfiguration(env=process.env){
 try{
  const privateKey=createPrivateKey((env.BILLING_SIGNING_PRIVATE_KEY||'').replaceAll('\\n','\n'));
  if(privateKey.asymmetricKeyType!=='ec'||privateKey.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error();
  const publicJwk=createPublicKey(privateKey).export({format:'jwk'});
  return {privateKey,publicJwk,keyId:createHash('sha256').update(JSON.stringify(publicJwk)).digest('hex').slice(0,16)};
 }catch{throw new AccountError('ACCESS_SIGNING_NOT_READY','Your account is connected, but the server Premium-signing key is not configured correctly. No checkout is required for an administrator.',503);}
}
export function adminDeviceLease(config,device,credentialHash,now=Math.floor(Date.now()/1000)){
 const end=Math.floor(new Date(device.expires_at).getTime()/1000);
 if(device.role!=='admin'||device.revoked_at||device.disabled_at||!Number.isFinite(end)||end<=now||!/^[a-f0-9]{64}$/.test(credentialHash)||!/^[a-f0-9]{64}$/.test(device.billing_id||''))throw new AccountError('ACCESS_DENIED','Current administrator access could not be confirmed.',403);
 const claims={iss:'chatdrobe-billing-test',aud:'chatdrobe-extension',sub:device.billing_id,did:credentialHash,environment:'test',plan:'plus',accessSource:'admin',iat:now,exp:Math.min(now+ACCESS_SECONDS,end),jti:randomUUID()};
 const header={alg:'ES256',typ:'JWT',kid:config.keyId};
 const encoded=[header,claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
 const signature=sign('sha256',Buffer.from(encoded),{key:config.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
 return {token:encoded+'.'+signature,plan:'plus',environment:'test',accessSource:'admin',expiresAt:claims.exp};
}
