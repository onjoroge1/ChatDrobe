import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign,verify} from 'node:crypto';
import {loadSigningKey,signingReadiness,signingHelp} from '../signing-key.mjs';
const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pem=pair.privateKey.export({format:'pem',type:'pkcs8'}),b64=pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
const env=value=>({BILLING_SIGNING_PRIVATE_KEY:value});
test('missing, empty, malformed and wrong-curve signing keys are distinguished without leaking inputs',()=>{
 for(const value of [undefined,'','  '])assert.equal(signingReadiness(env(value)).status,'missing');
 for(const value of ['billing-private.pem','BILLING_SIGNING_PRIVATE_KEY='+pem,'sk_test_this_is_not_a_signing_key',pair.publicKey.export({format:'pem',type:'spki'}),'x'.repeat(9000)]){const r=signingReadiness(env(value));assert.equal(r.ready,false);assert.equal(r.status,'invalid_format');assert.ok(!JSON.stringify(r).includes(value));}
 const wrong=generateKeyPairSync('ec',{namedCurve:'secp384r1'});assert.equal(signingReadiness(env(wrong.privateKey.export({format:'pem',type:'pkcs8'}))).status,'wrong_curve');
});
test('multiline, CRLF, literal newlines, quoted PEM and base64 DER normalize to the same public identity',()=>{
 const variants=[pem,pem.replaceAll('\n','\r\n'),pem.replaceAll('\n','\\n'),'"'+pem.replaceAll('\n','\\n')+'"',"'"+pem.trim()+"'",b64];
 const id=loadSigningKey(env(pem)).keyId;for(const value of variants)assert.equal(loadSigningKey(env(value)).keyId,id);
});
test('readiness exposes only public metadata, and a different valid key is not falsely called compatible',()=>{
 const r=signingReadiness(env(pem));assert.equal(r.ready,true);assert.equal(r.matchesExtension,false);assert.equal(r.status,'key_mismatch');assert.deepEqual(Object.keys(r).sort(),['configured','ready','keyId','expectedKeyId','matchesExtension','status'].sort());assert.ok(!JSON.stringify(r).includes('PRIVATE KEY'));assert.ok(!JSON.stringify(r).includes(b64));
});
test('normalized private key signs verifiable payloads and never accepts a public key as a private secret',()=>{
 const config=loadSigningKey(env(b64)),message=Buffer.from('test access proof'),signature=sign('sha256',message,{key:config.privateKey,dsaEncoding:'ieee-p1363'});assert.ok(verify('sha256',message,{key:pair.publicKey,dsaEncoding:'ieee-p1363'},signature));assert.throws(()=>loadSigningKey(env(pair.publicKey.export({format:'pem',type:'spki'}))));
});
test('operator guidance names the existing variable and does not instruct an admin to pay or reconnect',()=>{
 for(const status of ['missing','invalid_format','wrong_curve']){const h=signingHelp(status);assert.match(h,/BILLING_SIGNING_PRIVATE_KEY/);assert.match(h,/redeploy/);assert.doesNotMatch(h,/purchase required|pay to unlock/i);}
});
