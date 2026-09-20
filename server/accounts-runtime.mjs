import {databaseUrl} from './database-config.mjs';
import {connectStore} from './pg-store.mjs';
import {webConfig,cookieValue,COOKIE,requireOrigin} from './accounts-policy.mjs';
import {accountsStore} from './accounts-store.mjs';import {accountService} from './accounts-service.mjs';
import {accountPayments} from './accounts-payments.mjs';import {codeMailer} from './email-delivery.mjs';
import {ownerConfiguration} from './owner-credentials.mjs';import {ownerAccess} from './owner-access.mjs';
import {extensionDevices} from './extension-devices.mjs';
let pending;
export function accountRuntime(){
 if(!pending)pending=(async()=>{
  const owner=ownerConfiguration(),web={...webConfig(),ownerReady:owner.ready},{pool,store}=await connectStore(databaseUrl());
  const original=accountsStore(pool),ownerLogin=ownerAccess({pool,store,accounts:original,configuration:owner});
  const accounts={...original,session:ownerLogin.authenticateSession},payments=accountPayments({web,accounts,store});
  const base=accountService({accounts,billingStore:store,mailer:codeMailer(web),config:web,payments});
  const devices=extensionDevices({pool,store,owner});
  const service={...base,ownerLogin:ownerLogin.login,async admin(user,filters){const result=await base.admin(user,filters);return {...result,coverage:'Registered ChatDrobe accounts: email-verified users and explicitly provisioned owner accounts. Anonymous installations are not counted. Subscription columns are last-verified snapshots; Test Plus is not a live paying customer.'};},async profile(user){const result=await base.profile(user);return {...result,extensionLinkingAvailable:true,user:{...result.user,identitySource:user.identitySource||'email_code',emailVerified:user.identitySource!=='operator_credentials'}};},async signoutAll(user){await devices.revokeAll(user);return base.signoutAll(user);}};
  return {web,owner,ownerLogin,pool,accounts,store,payments,devices,service};
 })().catch(e=>{pending=null;throw e;});return pending;
}
export async function billingAccount(req){const {service,web}=await accountRuntime();requireOrigin(req,web);const user=await service.authenticate(cookieValue(req.headers.cookie,COOKIE));return user.billingId;}
