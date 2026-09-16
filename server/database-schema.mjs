/** A read-only schema contract; no account contents or schema details are returned publicly. */
export const SCHEMA_VERSION='001_billing';
const EXPECTED={
  chatdrobe_billing_installs:{id:'text',state:'jsonb',updated_at:'timestamp with time zone'},
  chatdrobe_billing_events:{id:'text',install_id:'text',processed_at:'timestamp with time zone'},
  chatdrobe_billing_limits:{name:'text',bucket:'bigint',count:'integer'},
  chatdrobe_billing_schema_migrations:{version:'text',checksum:'text',applied_at:'timestamp with time zone'}
};
export async function schemaReady(client) {
  const result=await client.query(`SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname=ANY($1::text[]) AND a.attnum>0 AND NOT a.attisdropped`,[Object.keys(EXPECTED)]);
  for(const [table,columns] of Object.entries(EXPECTED)) for(const [column,type] of Object.entries(columns))
    if(!result.rows.some(r=>r.relname===table&&r.attname===column&&r.type===type&&r.attnotnull)) return false;
  const constraints=await client.query(`SELECT c.relname,k.contype,pg_get_constraintdef(k.oid) AS definition
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[])`,[Object.keys(EXPECTED)]);
  for(const [table,definition] of Object.entries({chatdrobe_billing_installs:'PRIMARY KEY (id)',
    chatdrobe_billing_events:'PRIMARY KEY (id)',chatdrobe_billing_limits:'PRIMARY KEY (name, bucket)',
    chatdrobe_billing_schema_migrations:'PRIMARY KEY (version)'}))
    if(!constraints.rows.some(r=>r.relname===table&&r.contype==='p'&&r.definition===definition)) return false;
  if(!constraints.rows.some(r=>r.relname==='chatdrobe_billing_events'&&r.contype==='f'&&
      /FOREIGN KEY \(install_id\) REFERENCES (public\.)?chatdrobe_billing_installs\(id\)/.test(r.definition)))return false;
  const index=await client.query(`SELECT i.indisunique,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) AS definition
    FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='chatdrobe_customer_unique'`);
  if(!index.rows.some(r=>r.indisunique&&r.indisvalid&&r.indisready&&/chatdrobe_billing_installs/.test(r.definition)&&/customerId/.test(r.definition)))return false;
  const versions=await client.query('SELECT version FROM public.chatdrobe_billing_schema_migrations WHERE version=$1',[SCHEMA_VERSION]);
  return versions.rowCount===1;
}
