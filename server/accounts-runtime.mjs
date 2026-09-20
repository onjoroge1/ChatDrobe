import {databaseUrl} from './database-config.mjs';
import {connectStore} from './pg-store.mjs';
import {webConfig,cookieValue,COOKIE,requireOrigin,requireAdmin} from './accounts-policy.mjs';
import {accountsStore} from './accounts-store.mjs';import {accountService} from './accounts-service.mjs';
import {accountPayments} from './accounts-payments.mjs';import {codeMailer} from './email-delivery.mjs';
import {ownerConfiguration} from './owner-credentials.mjs';import {ownerAccess} from './owner-access.mjs';
import {extensionDevices} from './extension-devices.mjs';
import {membership} from './premium-membership.mjs';
let pending;
export function accountRuntime(){
 if(!pending)pending=(async()=>{
  const owner=ownerConfiguration(),web={...webConfig(),ownerReady:owner.ready},{pool,store}=await connectStore(databaseUrl());
  const original=accountsStore(pool),ownerLogin=ownerAccess({pool,store,accounts:original,configuration:owner});
  const accounts={...original,session:ownerLogin.authenticateSession},payments=accountPayments({web,accounts,store});
  const base=accountService({accounts,billingStore:store,mailer:codeMailer(web),config:web,payments});
  const devices=extensionDevices({pool,store,owner});
  const service={...base,ownerLogin:ownerLogin.login,
   async admin(user,filters){requireAdmin(user,{fresh:true});const result=await base.admin(user,filters);return {...result,coverage:'Registered accounts and last-verified subscription snapshots. Administrators receive complimentary Premium separately; they are not counted as paying subscribers. Anonymous installations are not counted.'};},
   async setup(user){requireAdmin(user,{fresh:true});return base.setup(user);},
   async activate(user,enabled){requireAdmin(user,{fresh:true});return base.activate(user,enabled);},
   async profile(user){const result=await base.profile(user);return {...result,access:membership(user,result.subscription),rememberedDays:30,extensionLinkingAvailable:true,user:{...result.user,identitySource:user.identitySource||'email_code',emailVerified:user.identitySource!=='operator_credentials'}};},
   async signoutAll(user){await devices.revokeAll(user);return base.signoutAll(user);}
  };
  return {web,owner,ownerLogin,pool,accounts,store,payments,devices,service};
 })().catch(e=>{pending=null;throw e;});return pending;
}
export async function billingAccount(req){const {service,web}=await accountRuntime();requireOrigin(req,web);const user=await service.authenticate(cookieValue(req.headers.cookie,COOKIE));return user.billingId;}
