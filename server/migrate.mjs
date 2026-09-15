import fs from 'node:fs/promises';
import {connectStore} from './pg-store.mjs';
if (!process.env.BILLING_DATABASE_URL) throw new Error('Set BILLING_DATABASE_URL in the environment; never pass it as a command-line argument.');
const {pool} = await connectStore(process.env.BILLING_DATABASE_URL);
try {
  await pool.query(await fs.readFile(new URL('./migrations/001_billing.sql', import.meta.url), 'utf8'));
  console.log('Billing migration 001 applied.');
} finally { await pool.end(); }
