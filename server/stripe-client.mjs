import {API_VERSION,BillingError} from './security.mjs';
export function stripeClient(secret,fetcher=fetch){return async function stripe(path,{method='GET',values={},idempotencyKey}={}){
 const regular=/^\/(customers|prices|subscriptions|checkout\/sessions|billing_portal\/sessions|invoices|charges)(\/[A-Za-z0-9_]+)?$/,setupRead=/^\/(webhook_endpoints\/we_[A-Za-z0-9]+|billing_portal\/configurations(?:\/bpc_[A-Za-z0-9]+)?)$/;
 if(!regular.test(path)&&!(method==='GET'&&setupRead.test(path)))throw new BillingError('PROVIDER_PATH','Unsupported provider resource.');
 const params=new URLSearchParams();for(const[key,value]of Object.entries(values)){if(Array.isArray(value))for(const item of value)params.append(key,String(item));else params.append(key,String(value));}
 const url='https://api.stripe.com/v1'+path+(method==='GET'&&params.size?'?'+params:''),headers={Authorization:`Bearer ${secret}`,'Stripe-Version':API_VERSION};
 if(method!=='GET')headers['Content-Type']='application/x-www-form-urlencoded';if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
 let response;try{response=await fetcher(url,{method,headers,body:method==='GET'?undefined:params.toString(),signal:AbortSignal.timeout(8000),redirect:'error'});}catch{throw new BillingError('PROVIDER_UNAVAILABLE','Payment service unavailable. Retry the same action; do not create another account.',503);}
 const text=await response.text();if(text.length>1048576)throw new BillingError('PROVIDER_RESPONSE','Unexpected payment service response.',502);
 let data;try{data=JSON.parse(text);}catch{throw new BillingError('PROVIDER_RESPONSE','Unexpected payment service response.',502);}
 if(!response.ok)throw new BillingError('PROVIDER_UNAVAILABLE','Payment service rejected the request. Retry or contact the beta operator.',response.status===429?503:502);
 if(data.livemode===true)throw new BillingError('LIVE_MODE_REJECTED','Live objects cannot be used by this test service.',503);return data;
};}
