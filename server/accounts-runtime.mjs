import {databaseUrl} from './database-config.mjs';
import {connectStore} from './pg-store.mjs';
import {webConfig,cookieValue,COOKIE,requireOrigin} from './accounts-policy.mjs';
import {accountsStore} from './accounts-store.mjs';
import {accountService} from './accounts-service.mjs';
import {accountPayments} from './accounts-payments.mjs';
import {codeMailer} from './email-delivery.mjs';
let pending;
export function accountRuntime(){
 if(!pending)pending=(async()=>{const web=webConfig(),{pool,store}=await connectStore(databaseUrl());const accounts=accountsStore(pool),payments=accountPayments({web,accounts,store});const service=accountService({accounts,billingStore:store,mailer:codeMailer(web),config:web,payments});return {web,accounts,store,payments,service};})().catch(e=>{pending=null;throw e;});
 return pending;
}
export async function billingAccount(req){const {service,web}=await accountRuntime();requireOrigin(req,web);const user=await service.authenticate(cookieValue(req.headers.cookie,COOKIE));return user.billingId;}
