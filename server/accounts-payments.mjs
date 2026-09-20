import {AccountError} from './accounts-policy.mjs';
import {configuration,API_VERSION} from './security.mjs';
import {stripeClient} from './stripe-client.mjs';
import {billingService} from './billing-service.mjs';
import {DEFAULT_PORTAL_QUERY,defaultPortalId} from './portal-config.mjs';
export const REQUIRED_EVENTS=Object.freeze(['checkout.session.completed','checkout.session.expired','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed','charge.refunded','charge.dispute.created','charge.dispute.closed']);
export function paymentReadiness(env,web){
 const checks={authentication:web.emailReady===true||web.ownerReady===true,database:!!(env.DATABASE_URL||env.BILLING_DATABASE_URL),testSecret:/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY||''),webhookSecret:/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET||''),price:/^price_[A-Za-z0-9]+$/.test(env.STRIPE_PLUS_PRICE_ID||''),signingKey:!!env.BILLING_SIGNING_PRIVATE_KEY,webhookEndpoint:/^we_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_ENDPOINT_ID||''),testMode:env.BILLING_MODE==='test',origin:env.BILLING_ORIGIN===web.origin};
 return {ready:Object.values(checks).every(Boolean),checks,portalSelection:'stripe_default',publicSignupAvailable:web.emailReady===true,mode:'test',livePayments:false};
}
export async function resolveDefaultPortal(stripe){
 const response=await stripe('/billing_portal/configurations',{values:{...DEFAULT_PORTAL_QUERY}}),id=defaultPortalId(response);
 if(!id)throw new AccountError('PORTAL_SETUP_REQUIRED','Configure the default customer portal in this Stripe sandbox: enable payment-method updates, invoice history and cancellation at period end; disable plan switching. ChatDrobe discovers it automatically.',503);return id;
}
export function accountPayments({env=process.env,web,accounts,store,providerFactory=stripeClient}){
 let preflight=null;function candidate(){return configuration(env,{website:true});}
 async function setup(){const readiness=paymentReadiness(env,web);if(!readiness.ready)return {...readiness,enabled:false};try{const c=candidate();if(!c.enabled)return {...readiness,ready:false,enabled:false};}catch{return {...readiness,ready:false,enabled:false,configurationValid:false};}return {...readiness,configurationValid:true,enabled:await accounts.enabled()};}
 async function validateProvider(){
  const s=await setup();if(!s.ready)throw new AccountError('BILLING_SETUP_REQUIRED','Complete the test-payment configuration shown in Admin before enabling checkout.',503);
  const c=candidate(),stripe=providerFactory(c.stripeSecret);
  const[price,endpoint,portalId]=await Promise.all([stripe('/prices/'+c.priceId),stripe('/webhook_endpoints/'+env.STRIPE_WEBHOOK_ENDPOINT_ID),resolveDefaultPortal(stripe)]);
  const validPrice=price.id===c.priceId&&price.active===true&&price.livemode===false&&price.type==='recurring'&&price.unit_amount===2900&&price.currency==='usd'&&price.recurring?.interval==='year'&&price.recurring?.interval_count===1;
  const validHook=endpoint.id===env.STRIPE_WEBHOOK_ENDPOINT_ID&&endpoint.livemode===false&&endpoint.status==='enabled'&&endpoint.url===web.origin+'/api/billing?action=webhook'&&endpoint.api_version===API_VERSION&&Array.isArray(endpoint.enabled_events)&&REQUIRED_EVENTS.every(e=>endpoint.enabled_events.includes(e)||endpoint.enabled_events.includes('*'));
  if(!validPrice||!validHook)throw new AccountError('PROVIDER_SETUP_REQUIRED','Stripe test price or webhook does not match the required configuration.',503);
  return {config:{...c,portalConfigurationId:portalId,webAccounts:true},stripe};
 }
 async function requireCheckout(){const s=await setup();if(!s.ready||!s.enabled)throw new AccountError('BILLING_DISABLED','Test checkout is not active yet. No payment was collected.',503);if(!preflight||preflight.until<=Date.now()){const promise=validateProvider(),entry={until:Date.now()+60000,promise};preflight=entry;promise.catch(()=>{if(preflight===entry)preflight=null;});}await preflight.promise;}
 return {setup,requireCheckout,
  async status(){const s=await setup();return {enabled:s.ready&&s.enabled,mode:s.ready&&s.enabled?'test':'off',livePayments:false};},
  async activate(user,enabled){if(enabled)await validateProvider();await accounts.activation(user.id,enabled);preflight=null;return {enabled,mode:enabled?'test':'off',livePayments:false};},
  async dependencies(){const config=candidate();if(!config.enabled)return {config};const cfg={...config,webAccounts:true},base=providerFactory(cfg.stripeSecret);
   const stripe=async(path,options={})=>{
    if(options.method==='POST'&&path==='/checkout/sessions')options={...options,values:{...options.values,success_url:web.origin+'/account/?checkout=returned',cancel_url:web.origin+'/account/?checkout=cancelled'}};
    if(options.method==='POST'&&path==='/billing_portal/sessions'){const portalId=await resolveDefaultPortal(base);options={...options,values:{...options.values,configuration:portalId,return_url:web.origin+'/account/'}};}
    return base(path,options);
   };return {config:cfg,store,service:billingService({config:cfg,store,stripe})};
  }
 };
}
