import {sign} from 'node:crypto';
/** Input is an entitlement issued by the in-process billing service, never client JSON. */
export function bindDeviceLease(config,issued,credentialHash,deviceExpiresAt){
 const original=JSON.parse(Buffer.from(issued.token.split('.')[1],'base64url').toString('utf8'));
 if(!/^[a-f0-9]{64}$/.test(credentialHash)||original.iss!=='chatdrobe-billing-test'||original.aud!=='chatdrobe-extension'||original.environment!=='test'||!['free','plus'].includes(original.plan)||original.accessSource==='admin')throw new Error('Unexpected internal entitlement contract.');
 let exp=original.exp;
 if(deviceExpiresAt!==undefined){const until=Math.floor(new Date(deviceExpiresAt).getTime()/1000);if(!Number.isFinite(until)||until<=original.iat)throw new Error('Device connection has expired.');exp=Math.min(exp,until);}
 const payload={...original,exp,did:credentialHash,accessSource:original.plan==='plus'?'stripe_test':'free'},header={alg:'ES256',typ:'JWT',kid:config.keyId};
 const encoded=[header,payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
 const signature=sign('sha256',Buffer.from(encoded),{key:config.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
 return {token:encoded+'.'+signature,plan:payload.plan,environment:'test',accessSource:payload.accessSource,expiresAt:payload.exp};
}
