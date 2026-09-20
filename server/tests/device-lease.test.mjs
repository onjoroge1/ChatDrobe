import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,createHash} from 'node:crypto';
import {lease} from '../security.mjs';import {bindDeviceLease} from '../device-lease.mjs';import verifier from '../../contracts/extension-entitlement.cjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
test('device-bound signature prevents reuse by another installation and rejects admin/free as Plus',async()=>{
 const{privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),publicJwk=publicKey.export({format:'jwk'}),cfg={privateKey,publicJwk,keyId:'fixture'},id=hash('account'),did=hash('first-device'),now=1700000000;
 const issued=lease(cfg,id,{status:'active',paidUntil:now+1000},now),bound=bindDeviceLease(cfg,issued,did),opts={keyId:'fixture',publicJwk,deviceId:did,now};
 assert.equal((await verifier.verify(bound.token,opts)).premium,true);
 await assert.rejects(verifier.verify(bound.token,{...opts,deviceId:hash('another-device')}));
 await assert.rejects(verifier.verify(issued.token,opts));
 await assert.rejects(verifier.verify(bound.token,{...opts,now:now+601}));
 const free=bindDeviceLease(cfg,lease(cfg,id,{status:'free',role:'admin'},now),did);assert.equal((await verifier.verify(free.token,opts)).premium,false);
 const[h,p,s]=bound.token.split('.'),payload=JSON.parse(Buffer.from(p,'base64url'));payload.exp+=86400;
 await assert.rejects(verifier.verify(h+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+s,opts));
});
