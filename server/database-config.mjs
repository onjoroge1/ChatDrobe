/** Server-only connection configuration. Never serialize a resolved URL into responses/logs. */
export class DatabaseConfigurationError extends Error {
  constructor() { super('Database configuration is missing, conflicting, or invalid.'); this.code='DATABASE_CONFIGURATION'; }
}
const present = value => typeof value === 'string' && value.trim() !== '';
export function hasDatabase(env=process.env) { return present(env.DATABASE_URL) || present(env.BILLING_DATABASE_URL); }
function parse(value) {
  try {
    const u=new URL(value.trim());
    if (!['postgres:','postgresql:'].includes(u.protocol) || !u.hostname ||
        !u.pathname || u.pathname==='/' || u.hash) throw Error();
    for (const key of u.searchParams.keys())
      if (!['sslmode','channel_binding','application_name'].includes(key)) throw Error();
    if (u.searchParams.has('sslmode') && !['require','verify-ca','verify-full','disable'].includes(u.searchParams.get('sslmode'))) throw Error();
    if (u.searchParams.has('channel_binding') && !['require','prefer','disable'].includes(u.searchParams.get('channel_binding'))) throw Error();
    return u;
  } catch { throw new DatabaseConfigurationError(); }
}
function sameDatabase(a,b) {
  const hostname = u => u.hostname.replace(/-pooler(?=\.)/,'');
  return hostname(a)===hostname(b) && (a.port||'5432')===(b.port||'5432') && a.pathname===b.pathname;
}
export function databaseUrl(env=process.env,{migration=false}={}) {
  const standard=present(env.DATABASE_URL)?env.DATABASE_URL.trim():'';
  const legacy=present(env.BILLING_DATABASE_URL)?env.BILLING_DATABASE_URL.trim():'';
  if (standard && legacy && standard!==legacy) throw new DatabaseConfigurationError();
  const selected=standard||legacy;
  if (!selected) throw new DatabaseConfigurationError();
  const runtime=parse(selected);
  if (migration && present(env.DATABASE_URL_UNPOOLED)) {
    const direct=parse(env.DATABASE_URL_UNPOOLED);
    if (!sameDatabase(runtime,direct)) throw new DatabaseConfigurationError();
    return direct.href;
  }
  return runtime.href;
}
export function poolConfiguration(value,{env=process.env}={}) {
  const u=parse(value), local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
  if (env.VERCEL && local) throw new DatabaseConfigurationError();
  const mode=u.searchParams.get('sslmode');
  if (!local && mode==='disable') throw new DatabaseConfigurationError();
  const channel=u.searchParams.get('channel_binding');
  // pg v8 negotiates SCRAM-SHA-256-PLUS when offered. This is not strict libpq require enforcement.
  const enableChannelBinding=channel!=='disable' && !local;
  for (const key of ['sslmode','channel_binding','application_name']) u.searchParams.delete(key);
  return {connectionString:u.href, max:3, connectionTimeoutMillis:10000,
    idleTimeoutMillis:10000, statement_timeout:15000, query_timeout:17000,
    allowExitOnIdle:true, application_name:'chatdrobe-billing', enableChannelBinding,
    ssl:local?false:{rejectUnauthorized:true,minVersion:'TLSv1.2'}};
}
export function productionDatabaseRelease(env=process.env){
  return ['1','true'].includes(env.VERCEL) && env.VERCEL_ENV==='production' &&
    env.VERCEL_GIT_COMMIT_REF==='main' && env.VERCEL_GIT_REPO_OWNER==='onjoroge1' &&
    env.VERCEL_GIT_REPO_SLUG==='ChatDrobe';
}
