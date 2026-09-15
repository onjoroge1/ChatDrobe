import {generateKeyPairSync} from 'node:crypto';
import {configuration, BillingError} from '../security.mjs';

export function testConfig() {
  const {privateKey} = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  return configuration({BILLING_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
    STRIPE_PLUS_PRICE_ID: 'price_fixture', BILLING_ORIGIN: 'https://billing.example', BILLING_DATABASE_URL: 'postgresql://local/test',
    BILLING_EXTENSION_IDS: 'a'.repeat(32), BILLING_SIGNING_PRIVATE_KEY: privateKey.export({format: 'pem', type: 'pkcs8'})});
}
export function memoryStore() {
  const rows = new Map(), events = new Set(), limits = new Map(), queues = new Map();
  return {rows, events,
    async read(id) { return rows.has(id) ? structuredClone(rows.get(id)) : null; },
    async findCustomer(customerId) { return [...rows].find(([, row]) => row.customerId === customerId)?.[0] || null; },
    async limit(name, max, seconds, now) { const key = name + ':' + Math.floor(now/seconds), n = (limits.get(key) || 0) + 1; limits.set(key,n); if(n>max)throw new BillingError('RATE_LIMIT','Please wait before trying again.',429); },
    async mutate(id, action, {create=false, eventId}={}) {
      const previous = queues.get(id) || Promise.resolve();
      const task = previous.catch(()=>{}).then(async()=> {
        if (!rows.has(id) && !create) return null;
        if (eventId && events.has(eventId)) return {duplicate:true};
        const row = structuredClone(rows.get(id)||{}), value = await action(row);
        rows.set(id,row); if(eventId)events.add(eventId); return value;
      });
      queues.set(id,task); return task;
    }
  };
}
export function fakeStripe() {
  let sequence=0; const data=new Map(), idem=new Map(), calls=[];
  data.set('/prices/price_fixture',{id:'price_fixture',livemode:false,active:true,type:'recurring',unit_amount:2900,currency:'usd',recurring:{interval:'year',interval_count:1}});
  const stripe=async (path, options={})=>{
    calls.push({path,options:structuredClone(options)});
    if(options.method==='POST') {
      if(options.idempotencyKey && idem.has(options.idempotencyKey)) {
        const old=idem.get(options.idempotencyKey);
        if(JSON.stringify(old.values)!==JSON.stringify(options.values))throw Error('Idempotency parameters changed');
        return structuredClone(data.get(old.path));
      }
      const v=options.values;let obj, location;
      if(path==='/customers') {obj={id:'cus_'+(++sequence),livemode:false,metadata:{chatdrobe_install:v['metadata[chatdrobe_install]']}};location='/customers/'+obj.id;}
      else if(path==='/checkout/sessions') { obj={id:'cs_test_'+(++sequence),livemode:false,customer:v.customer,metadata:{chatdrobe_install:v['metadata[chatdrobe_install]'],chatdrobe_attempt:v['metadata[chatdrobe_attempt]']},mode:'subscription',status:'open',payment_status:'unpaid',subscription:null,url:'https://checkout.stripe.com/c/pay/test'};location='/checkout/sessions/'+obj.id; }
      else if(path==='/billing_portal/sessions') return {url:'https://billing.stripe.com/p/session/test'};
      else throw Error('Unexpected POST '+path);
      data.set(location,obj); if(options.idempotencyKey)idem.set(options.idempotencyKey,{values:structuredClone(v),path:location});
      return structuredClone(obj);
    }
    if(!data.has(path))throw Error('Missing mock provider resource '+path);return structuredClone(data.get(path));
  };
  function pay(sessionId, now) {
    const session=data.get('/checkout/sessions/'+sessionId);
    const charge={id:'ch_'+(++sequence),livemode:false,paid:true,status:'succeeded',refunded:false,disputed:false,customer:session.customer};
    const invoice={id:'in_'+(++sequence),livemode:false,status:'paid',paid:true,amount_paid:2900,customer:session.customer,charge};
    const sub={id:'sub_'+(++sequence),livemode:false,metadata:structuredClone(session.metadata),customer:session.customer,status:'active',current_period_end:now+365*86400,
      cancel_at_period_end:false,pause_collection:null,items:{data:[{quantity:1,price:{id:'price_fixture',livemode:false}}],has_more:false},latest_invoice:invoice};
    invoice.subscription=sub.id;
    data.set('/subscriptions/'+sub.id,sub);data.set('/invoices/'+invoice.id,invoice);data.set('/charges/'+charge.id,charge);
    session.subscription=sub.id;session.payment_status='paid';session.status='complete';return sub;
  }
  return {stripe,data,idem,calls,pay};
}
