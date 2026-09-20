/* Pure, fail-closed portal policy. No environment, credentials, state writes or API calls. */
export const DEFAULT_PORTAL_QUERY = Object.freeze({active: true, is_default: true, limit: 2});

export function defaultPortalId(response) {
  if (response?.object !== 'list' || response.has_more !== false ||
      !Array.isArray(response.data) || response.data.length !== 1) return null;
  const portal = response.data[0];
  const features = portal?.features;
  if (portal?.object !== 'billing_portal.configuration' ||
      !/^bpc_[A-Za-z0-9]+$/.test(portal.id || '') ||
      portal.active !== true || portal.is_default !== true || portal.livemode !== false ||
      features?.subscription_cancel?.enabled !== true ||
      features.subscription_cancel.mode !== 'at_period_end' ||
      features.payment_method_update?.enabled !== true ||
      features.invoice_history?.enabled !== true ||
      features.subscription_update?.enabled !== false) return null;
  // Pin the ID from this exact validated response when creating the portal session.
  return portal.id;
}
