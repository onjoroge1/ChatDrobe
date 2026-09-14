import {configuration} from '../server/security.mjs';
import {stripeClient} from '../server/stripe-client.mjs';
import {billingService} from '../server/billing-service.mjs';
import {connectStore} from '../server/pg-store.mjs';
import {createHandler} from '../server/http.mjs';

// The raw IncomingMessage stream is used. Do not read req.body before signature verification.
export const config = {api: {bodyParser: false}};
let pending;
export default createHandler(async () => {
  const cfg = configuration();
  if (!cfg.enabled) return {config: cfg};
  if (!pending) pending = (async () => {
    const {store} = await connectStore(cfg.databaseUrl);
    return {config: cfg, store, service: billingService({config: cfg, store, stripe: stripeClient(cfg.stripeSecret)})};
  })().catch(error => { pending = null; throw error; });
  return pending;
});
