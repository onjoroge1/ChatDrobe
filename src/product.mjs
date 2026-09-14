const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

export const premiumPreviewFeatures = [
  {name:'Living Worlds',status:'Private beta',description:'Optional ambient scene routines that make selected worlds feel alive without turning the chat into a game.'},
  {name:'Rally Garage cruise',status:'Private beta',description:'A compact car cruise, park and headlight sequence that runs only when the page has a safe clear margin.'},
  {name:'Orbital Bridge drone',status:'Private beta',description:'A maintenance drone can undock, inspect and recharge in a small protected scene area.'},
  {name:'Solar Observatory orbit',status:'Private beta',description:'A miniature planetary orbit adds motion to the observatory while respecting reduced-motion and interaction stops.'},
  {name:'Word Bites',status:'Opt-in preview',description:'A separate text-aware experiment with its own permission boundary. It is not enabled by the new no-text-scan scene routines.'},
  {name:'Premium world collection',status:'Private beta',description:'Starlit Cat, Mecha Reactor, Neon Sentinel and Retro Arcade are the first four Plus-preview worlds.'}
];

export const plannedPlusFeatures = [
  {name:'Advanced scene editor',description:'More control over scene density, placement and decorative behavior.'},
  {name:'Scheduled worlds',description:'Automatically switch to selected worlds at user-chosen times.'},
  {name:'Expanded workspace limits',description:'More saved prompts, shortcuts and named workspaces than the Free plan.'},
  {name:'Future premium world drops',description:'New original visual worlds and scene routines added to the premium collection.'}
];

export function counts(themes){
  return {
    total:themes.length,
    free:themes.filter(t=>t.plan==='free').length,
    plus:themes.filter(t=>t.plan==='pro').length,
    palettes:themes.length*2
  };
}

export function upgradeLegacyCopy(html,themes){
  const c=counts(themes);
  return html
    .replaceAll('All 12 worlds unlocked',`All ${c.total} worlds unlocked`)
    .replaceAll('Explore all 12 worlds',`Explore all ${c.total} worlds`)
    .replaceAll('12 original worlds',`${c.total} original worlds`)
    .replaceAll('12 worlds',`${c.total} worlds`)
    .replaceAll('8 complete original worlds',`${c.free} complete original worlds`);
}

function featureCards(items){
  return `<div class="feature-grid product-feature-grid">${items.map(item=>`<article class="feature product-feature"><span class="tag">${esc(item.status||'Included')}</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p></article>`).join('')}</div>`;
}

export function homeInsert(themes){
  const c=counts(themes);
  return `<section class="section wrap product-positioning"><div class="section-heading"><div><p class="eyebrow">A PERSONAL WORLD + A PRACTICAL WORKSPACE</p><h2>Not just another<br>ChatGPT utility extension.</h2></div><p>ChatDrobe starts with how your workspace feels, then adds small local tools around the conversation. Your chat stays ChatGPT; the browser gets a wardrobe and a workbench.</p></div><div class="value-grid"><article><strong>${c.total}</strong><span>original worlds</span></article><article><strong>${c.free}</strong><span>Free worlds</span></article><article><strong>${c.plus}</strong><span>Plus-preview worlds</span></article><article><strong>${c.palettes}</strong><span>light/dark palettes</span></article></div><div class="feature-grid product-feature-grid"><article class="feature"><h3>Dress the workspace.</h3><p>Original cats, mecha, comics, cars, spaceships, nature and space worlds designed as a coordinated visual system.</p></article><article class="feature"><h3>Make it comfortable.</h3><p>Reading width, fonts, spacing, focus controls and named workspaces help long sessions feel less cluttered.</p></article><article class="feature"><h3>Bring it to life.</h3><p>Plus-preview Living Worlds add optional ambient routines such as a rally-car pass, maintenance drone and miniature orbit.</p></article></div><div class="actions"><a class="btn" href="/features/">See every feature ↗</a><a href="/premium/">Explore Plus preview</a></div></section>`;
}

export function injectHome(html,themes){
  const marker='<section class="band section"><div class="wrap"><div class="center"><p class="eyebrow">YOUR SPACE. YOUR CHOICE.</p>';
  if(!html.includes(marker)) return upgradeLegacyCopy(html,themes);
  return upgradeLegacyCopy(html.replace(marker,homeInsert(themes)+marker),themes);
}

export function featuresPage(themes){
  const c=counts(themes);
  return `<section class="section wrap"><div class="page-intro"><p class="eyebrow">THE FULL CHATDROBE LAYER</p><h1>Make ChatGPT feel more like your place.</h1><p>ChatDrobe combines original visual worlds, reading controls and a small local workspace. The private beta currently contains ${c.total} worlds: ${c.free} Free and ${c.plus} Plus-preview.</p></div><div class="feature-section"><p class="eyebrow">FREE FOUNDATION</p><h2>Useful before you ever pay.</h2>${featureCards([
    {name:`${c.free} Free worlds`,description:'Cozy, mecha, comics, nature, calm, code, cars, spaceships and space looks are included in the proposed Free plan.'},
    {name:'Reading controls',description:'Adjust typography, line spacing and conversation width. Focus mode can hide the ChatGPT sidebar without deleting anything.'},
    {name:'Prompt shelf',description:'Keep reusable prompts locally and copy them when needed. The extension does not automatically send them.'},
    {name:'Notes + scratchpad',description:'Keep local working notes close to the chat without turning them into conversation messages.'},
    {name:'Focus timer',description:'A lightweight timer for focused sessions in the browser side panel.'},
    {name:'Named workspaces',description:'Save combinations of reading and appearance preferences for different kinds of work.'}
  ])}</div><div class="feature-section premium-band"><p class="eyebrow">PLUS PREVIEW</p><h2>The worlds can do more than sit still.</h2><p>These features exist in the private test package or are explicitly marked as planned. Premium access is not being sold yet.</p>${featureCards(premiumPreviewFeatures)}<div class="actions"><a class="btn" href="/premium/">See the Plus experience ↗</a><a href="/pricing/">Compare Free and Plus</a></div></div><div class="feature-section"><p class="eyebrow">PLANNED PLUS EXPANSION</p><h2>Where the premium layer goes next.</h2>${featureCards(plannedPlusFeatures.map(x=>({...x,status:'Planned'})))}</div></section>`;
}

export function premiumPage(themes){
  const c=counts(themes);
  const plusWorlds=themes.filter(t=>t.plan==='pro');
  return `<section class="section wrap"><div class="page-intro"><p class="eyebrow">PLUS · PRIVATE PREVIEW</p><h1>Turn a theme into a living little world.</h1><p>Free ChatDrobe changes the workspace. Plus is where the scenery becomes more expressive: premium worlds, opt-in ambient routines and deeper personalization controls.</p><div class="actions"><a class="btn" href="/install/">Try the unlocked beta ↗</a><a href="/pricing/">Compare plans</a></div><p class="micro">No checkout is active. All beta testers can currently inspect the Plus-preview features.</p></div><div class="living-world-steps"><article><span>01</span><h3>Choose a world.</h3><p>${c.total} worlds are currently in the beta, including ${c.plus} premium-preview worlds.</p></article><article><span>02</span><h3>Opt into motion.</h3><p>Ambient routines respect reduced motion and stop when the user interacts, changes focus or the layout is not safe.</p></article><article><span>03</span><h3>Keep the chat primary.</h3><p>Scenes stay small and decorative. The new Explorer routines do not inspect transcript text.</p></article></div><section class="feature-section"><p class="eyebrow">LIVING WORLDS</p><h2>Premium routines already in the test package.</h2>${featureCards(premiumPreviewFeatures)}</section><section class="feature-section"><p class="eyebrow">PREMIUM WARDROBE</p><h2>${c.plus} worlds reserved for the Plus collection.</h2><div class="premium-world-list">${plusWorlds.map(t=>`<a href="/themes/${t.id}/"><strong>${esc(t.name)}</strong><span>${esc(t.label)}</span><small>${esc(t.description)}</small></a>`).join('')}</div></section><section class="feature-section"><p class="eyebrow">NEXT</p><h2>Premium features we are designing toward.</h2>${featureCards(plannedPlusFeatures.map(x=>({...x,status:'Planned'})))}</section><div class="notice-box"><strong>Commercial launch boundary</strong><p>Billing, server-verified entitlements, cancellation and production licensing are still separate launch work. The current website should not collect payment until those controls are complete.</p></div></section>`;
}

export function pricingPage(themes,config){
  const c=counts(themes);
  const rows=[
    ['Original worlds',`${c.free} included`,`${c.total} total (${c.plus} premium)`],
    ['Light / dark palettes','Included','Included'],
    ['Reading width, font and spacing','Included','Included'],
    ['Local prompts, notes and timer','Included','Expanded limits planned'],
    ['Named workspaces','3 proposed','Expanded limits planned'],
    ['Living World ambient routines','—','Private beta'],
    ['Rally cruise / park / headlights','—','Private beta'],
    ['Orbital Bridge maintenance drone','—','Private beta'],
    ['Solar Observatory miniature orbit','—','Private beta'],
    ['Word Bites text-aware experiment','—','Opt-in preview'],
    ['Advanced scene editor','—','Planned'],
    ['Scheduled worlds','—','Planned']
  ];
  return `<section class="section wrap"><div class="page-intro"><p class="eyebrow">FREE SHOULD FEEL COMPLETE</p><h1>Start with a real product. Upgrade for a richer world.</h1><p>The proposed launch model keeps core personalization and everyday tools useful for free. Plus adds premium worlds, Living World routines and deeper customization.</p></div><div class="price-grid"><article class="price-card"><span class="tag">PROPOSED LAUNCH PLAN</span><h2>Free</h2><p>Personalize the workspace and keep your everyday tools close.</p><p class="price">$0 <span>/ forever</span></p><ul><li>${c.free} original worlds</li><li>Reading and focus controls</li><li>Local prompts, notes and timer</li><li>3 named workspaces proposed</li></ul><a class="btn outline" href="/install/">Try the beta</a></article><article class="price-card plus"><span class="tag">PLUS · NOT FOR SALE YET</span><h2>Plus</h2><p>Premium worlds and a more alive, expressive workspace.</p><p class="price">$${esc(config.plusAnnualUsd)} <span>/ year, proposed</span></p><ul><li>Everything in Free</li><li>${c.plus} premium-preview worlds</li><li>Living World ambient routines</li><li>Expanded limits + advanced controls planned</li></ul><a class="btn" href="/premium/">Explore Plus preview</a></article></div><div class="table-wrap feature-compare"><table><thead><tr><th>Feature</th><th>Free</th><th>Plus</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div><div class="notice-box"><strong>No payment is being collected in this beta.</strong><p>The $${esc(config.plusAnnualUsd)}/year figure is a proposed price, not an active offer. Checkout should stay disabled until billing, entitlements, cancellation flows and the final premium feature set are production-ready.</p></div><div class="actions"><a href="/features/">See all features ↗</a><a href="/premium/">See Plus in detail ↗</a></div></section>`;
}

export function marketingPage(){
  return `<section class="section wrap"><div class="page-intro"><p class="eyebrow">GO-TO-MARKET</p><h1>Sell the feeling first. Prove the utility second.</h1><p>ChatDrobe should be positioned as the personal workspace layer for ChatGPT: distinctive worlds that make people want to show their setup, backed by practical local tools that make them stay.</p></div><div class="feature-grid product-feature-grid"><article class="feature"><h3>Visual discovery</h3><p>Short before/after videos, world reveals and “choose your ChatGPT vibe” clips are the highest-leverage top-of-funnel format.</p></article><article class="feature"><h3>Shareable worlds</h3><p>Each world needs a clean landing page, a memorable name and a screenshot or short motion demo that can stand alone on social.</p></article><article class="feature"><h3>Utility retention</h3><p>Once installed, prompts, reading controls, workspaces and local notes give users reasons to keep the extension enabled.</p></article></div><section class="feature-section"><p class="eyebrow">LAUNCH LOOP</p><div class="living-world-steps"><article><span>01</span><h3>Show</h3><p>Publish transformation clips: plain ChatGPT → Mooncat, Rally Garage or Orbital Bridge.</p></article><article><span>02</span><h3>Install</h3><p>Lead with a generous Free plan so viewers can reproduce the look immediately.</p></article><article><span>03</span><h3>Share</h3><p>Encourage users to post their favorite world or workspace setup and tag the product.</p></article><article><span>04</span><h3>Upgrade</h3><p>Use Living Worlds and premium drops as the recurring reason to move to Plus.</p></article></div></section><div class="notice-box"><strong>Launch prerequisite</strong><p>Before public SEO/indexing and paid acquisition, finish brand/domain clearance, Chrome Web Store release readiness, privacy/support surfaces and verified commercial billing.</p></div></section>`;
}
