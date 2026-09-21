/* Public endpoint/key only. Sandbox release: no tester bypass and no live payments. */
(function(root){
 'use strict';const origin='https://www.chatdrobe.com';
 root.ChatDrobeCommerceConfig=Object.freeze({
  channel:'sandbox',websiteOrigin:origin,homeUrl:origin+'/',premiumUrl:origin+'/premium/',pricingUrl:origin+'/pricing/',helpUrl:origin+'/help/',privacyUrl:origin+'/privacy/',
  billingOrigin:origin,billingApiUrl:origin+'/api/billing',proposedAnnualUsd:29,annualUsd:29,checkoutEnabled:true,checkoutUrl:'',licensingReady:true,allowTesterPreview:false,
  entitlementKey:Object.freeze({keyId:'665a83c1cc892eab',publicJwk:Object.freeze({kty:'EC',crv:'P-256',x:'p2hz4ZR5Y3ymck6ipZIm8HEXH6CJkz5Zv1H6woNwTUw',y:'sDSywIseYPO9UBL6abDpB2wSDT_9ireY70GGfgBXQPk'})})
 });
})(globalThis);
