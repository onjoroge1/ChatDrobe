import {BillingError} from './security.mjs';
import {poolConfiguration} from './database-config.mjs';

/** All reads/writes within a mutation share one client and one row lock. */
export function pgStore(pool) {
  async function mutate(id, action, {create = false, eventId} = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '5s'");
      if (create) await client.query('INSERT INTO public.chatdrobe_billing_installs (id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
      const result = await client.query('SELECT state FROM public.chatdrobe_billing_installs WHERE id=$1 FOR UPDATE', [id]);
      if (!result.rowCount) { await client.query('ROLLBACK'); return null; }
      if (eventId) {
        const inserted = await client.query('INSERT INTO public.chatdrobe_billing_events (id,install_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id', [eventId, id]);
        if (!inserted.rowCount) { await client.query('ROLLBACK'); return {duplicate: true}; }
      }
      const state = result.rows[0].state;
      const value = await action(state);
      await client.query('UPDATE public.chatdrobe_billing_installs SET state=$2::jsonb, updated_at=now() WHERE id=$1', [id, JSON.stringify(state)]);
      await client.query('COMMIT');
      return value;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  return {
    mutate,
    async read(id) { return (await pool.query('SELECT state FROM public.chatdrobe_billing_installs WHERE id=$1', [id])).rows[0]?.state || null; },
    async findCustomer(customerId) { return (await pool.query("SELECT id FROM public.chatdrobe_billing_installs WHERE state->>'customerId'=$1", [customerId])).rows[0]?.id || null; },
    async limit(name, max, seconds, now) {
      const bucket = Math.floor(now / seconds);
      const result = await pool.query('INSERT INTO public.chatdrobe_billing_limits (name,bucket,count) VALUES ($1,$2,1) ON CONFLICT (name,bucket) DO UPDATE SET count=chatdrobe_billing_limits.count+1 RETURNING count', [name, bucket]);
      if (result.rows[0].count > max) throw new BillingError('RATE_LIMIT', 'Please wait before trying again.', 429);
    }
  };
}
export async function connectStore(databaseUrl) {
  const options=poolConfiguration(databaseUrl);
  const {Pool} = await import('pg');
  const pool = new Pool(options);
  pool.on('error', () => console.error('billing: database connection error'));
  return {store: pgStore(pool), pool};
}
