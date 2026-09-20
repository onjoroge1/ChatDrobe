import {createPrivateKey,createPublicKey,createHash} from 'node:crypto';
// Public release fingerprint, not a key or a grant. Update only with a reviewed extension release.
export const EXTENSION_SIGNING_KEY_ID='665a83c1cc892eab';
export class SigningKeyError extends Error {constructor(code){super(code);this.code=code;}}
/** Normalize common secret-entry formats; never infer a key from another secret or create one. */
export function loadSigningKey(env=process.env){
 let text=env.BILLING_SIGNING_PRIVATE_KEY;
 if(typeof text!=='string'||!text.trim())throw new SigningKeyError('missing');
 if(text.length>8192)throw new SigningKeyError('invalid_format');
 text=text.trim();
 if((text.startsWith('"')&&text.endsWith('"'))||(text.startsWith("'")&&text.endsWith("'")))text=text.slice(1,-1).trim();
 text=text.replaceAll('\\r\\n','\n').replaceAll('\\n','\n').replace(/\r\n?/g,'\n').trim();
 let privateKey;
 try{
  if(text.startsWith('-----BEGIN ')){
   if(!/^-----BEGIN (?:EC )?PRIVATE KEY-----[\s\S]+-----END (?:EC )?PRIVATE KEY-----$/.test(text))throw Error();
   privateKey=createPrivateKey(text);
  }else{
   // A single-line, standard base64 PKCS#8 value is accepted under the SAME env variable.
   if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text)||text.length%4!==0)throw Error();
   const bytes=Buffer.from(text,'base64');if(bytes.toString('base64')!==text)throw Error();
   privateKey=createPrivateKey({key:bytes,format:'der',type:'pkcs8'});
  }
 }catch{throw new SigningKeyError('invalid_format');}
 if(privateKey.asymmetricKeyType!=='ec'||privateKey.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw new SigningKeyError('wrong_curve');
 const publicJwk=createPublicKey(privateKey).export({format:'jwk'});
 return {privateKey,publicJwk,keyId:createHash('sha256').update(JSON.stringify(publicJwk)).digest('hex').slice(0,16)};
}
/** No private material, account data, credentials, DB reads or provider calls. */
export function signingReadiness(env=process.env){
 try{const {keyId}=loadSigningKey(env);return {configured:true,ready:true,keyId,expectedKeyId:EXTENSION_SIGNING_KEY_ID,matchesExtension:keyId===EXTENSION_SIGNING_KEY_ID,status:keyId===EXTENSION_SIGNING_KEY_ID?'ready':'key_mismatch'};}
 catch(error){return {configured:!!env.BILLING_SIGNING_PRIVATE_KEY?.trim(),ready:false,keyId:null,expectedKeyId:EXTENSION_SIGNING_KEY_ID,matchesExtension:false,status:error instanceof SigningKeyError?error.code:'invalid_format'};}
}
export function signingHelp(status){
 if(status==='missing')return 'BILLING_SIGNING_PRIVATE_KEY is missing on this deployment. Add the existing matching private key to Vercel Production and redeploy. Do not purchase Premium or reconnect your account.';
 if(status==='wrong_curve')return 'BILLING_SIGNING_PRIVATE_KEY is not a P-256 private key. Restore the matching key in Vercel Production and redeploy. Your account connection is saved.';
 return 'BILLING_SIGNING_PRIVATE_KEY cannot be read. Use the complete private PEM or its base64 PKCS#8 value, not a filename, public key, Stripe key or environment-variable assignment; then redeploy. Your account connection is saved.';
}
