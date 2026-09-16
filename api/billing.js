import {configuration} from '../server/security.mjs';
import {createHandler} from '../server/http.mjs';
import {databaseProbe} from '../server/database-readiness.mjs';
import {accountRuntime,billingAccount} from '../server/accounts-runtime.mjs';
export const config={api:{bodyParser:false}};
const databaseStatus=databaseProbe();
export default createHandler(async()=>{const cfg=configuration(process.env,{website:true});if(!cfg.enabled)return {config:cfg};return (await accountRuntime()).payments.dependencies();},{databaseStatus,authenticate:billingAccount,checkoutGuard:async()=>(await accountRuntime()).payments.requireCheckout(),billingStatus:async()=>{if(!process.env.BILLING_MODE||process.env.BILLING_MODE==='off')return {enabled:false,mode:'off',livePayments:false};return (await accountRuntime()).payments.status();}});
