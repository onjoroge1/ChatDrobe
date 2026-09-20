import {scrypt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const PARAMETERS={N:131072,r:8,p:1,maxmem:192*1024*1024};
const FORMAT=/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function ownerConfiguration(env=process.env){
 const email=typeof env.ADMIN_EMAIL==='string'?env.ADMIN_EMAIL.trim().toLowerCase():'';
 const passwordHash=env.ADMIN_PASSWORD_HASH||'';
 const ready=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254&&FORMAT.test(passwordHash);
 return Object.freeze({ready,email:ready?email:'',passwordHash:ready?passwordHash:'',version:ready?digest('owner-credentials-v1\0'+email+'\0'+passwordHash):''});
}
export async function makeOwnerHash(password){
 if(typeof password!=='string'||password.length<20||password.length>128||Buffer.byteLength(password,'utf8')>512)throw new Error('Use a password between 20 and 128 characters.');
 const salt=randomBytes(16).toString('hex');
 const key=await derive(password,Buffer.from(salt,'hex'),64,PARAMETERS);
 return `scrypt-v1$${salt}$${key.toString('hex')}`;
}
export async function verifyOwnerPassword(password,encoded){
 const match=FORMAT.exec(encoded||'');
 if(!match||typeof password!=='string'||password.length<1||password.length>128||Buffer.byteLength(password,'utf8')>512)return false;
 const key=await derive(password,Buffer.from(match[1],'hex'),64,PARAMETERS);
 return timingSafeEqual(key,Buffer.from(match[2],'hex'));
}
