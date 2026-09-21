import {extensionVersion} from './product-release.mjs';
/* Build-time collection presentation. No extension runtime or payment code is copied here. */
import {card} from './render.mjs';
const ids=['rally','bridge','observatory'];
const routines={rally:['Rally cruise','The original car rolls along a miniature road, parks, and gives one gentle headlight glow.'],bridge:['Drone inspection','A maintenance drone undocks, inspects its tiny console, and returns to charge.'],observatory:['Solar orbit','A planet completes a quiet orbit in a miniature observatory, then comes to rest.']};
export function explorerContent(html,route,themes){
 const total=themes.length,free=themes.filter(t=>t.plan==='free').length;
 html=html.replaceAll('All 12 worlds unlocked',`${free} Free worlds · Premium account access`)
  .replaceAll('All 12 themes are unlocked in this beta.',`${free} Free worlds are available without a subscription. Premium requires verified eligible account access.`)
  .replaceAll('All 12 original worlds are unlocked in the private beta.',`${free} original worlds are Free. Four Premium worlds require the verified eligible account access; no paid checkout is active.`)
  .replaceAll('All 12 worlds are unlocked.',`${free} worlds are Free; Premium requires the verified account access.`)
  .replaceAll('8 complete original worlds',`${free} complete original worlds`)
  .replaceAll('8 Free / full collection Plus',`${free} Free / full collection Plus`)
  .replaceAll('All unlocked in the private beta.','Free starter worlds plus a Premium account collection.')
  .replaceAll('Unlocked now','Free world / Premium account access')
  .replaceAll('12 original worlds',`${total} original worlds`)
  .replaceAll('Explore all 12 worlds',`Explore all ${total} worlds`)
  .replaceAll('>12 worlds<',`>${total} worlds<`)
  .replaceAll('12 theme worlds',`${total} theme worlds`)
  .replaceAll('12 original theme',`${total} original theme`)
  .replaceAll('12 original world',`${total} original world`)
  .replaceAll('>Unlocked</td>',`>${free} Free + Premium account access</td>`)
  .replaceAll('Try the unlocked beta','Try the private beta')
  .replaceAll('Extension 0.2.0 · Private beta',`Extension ${extensionVersion} · Private beta`)
  .replaceAll('extension beta 0.2.0',`extension beta ${extensionVersion}`);
 if(route==='/'){
  const collection=`<section class="section wrap explorer-collection"><div class="section-heading"><div><p class="eyebrow">NEW · THE EXPLORER COLLECTION</p><h2>A garage. A bridge.<br>A whole solar system.</h2></div><p>Three new Free worlds with bright default palettes. Original miniatures. Optional Premium idle routines. Your conversations stay center stage.</p></div><div class="world-grid">${ids.map(id=>card(themes.find(t=>t.id===id))).join('')}</div><p class="micro">Use extension ${extensionVersion}. Choose a world and motion level in Worlds. Premium needs verified account access; checkout is not connected.</p></section>`;
  html=html.replace('<section class="proof-strip',collection+'<section class="proof-strip');
 }
 const id=ids.find(id=>route===`/themes/${id}/`);
 if(id){
  const [name,description]=routines[id],action={rally:'Start Rally cruise',bridge:'Start drone inspection',observatory:'Start solar orbit'}[id];
  const details=`<section class="world-behavior notice-box"><h2>${name}</h2><p>${description}</p><p>The light/dark world is Free. Its routine is a Premium feature in extension <strong>${extensionVersion}</strong>. Select this theme in Worlds, open <strong>Advanced effects</strong>, then choose <strong>${action}</strong>. This optional routine has a separate start action; the primary Subtle and Playful choices use gentle decorative motion for static themes. Use Check display to inspect the current page status. Premium requires verified account access.</p><p>Motion starts only after you enable it and become idle. These new routines use clear page margins, skip narrow layouts, stop on input, and do not inspect message text. Static appearance files never enable motion or grant Premium access.</p></section>`;
  html=html.replace('<section class="section"><h2>Another change',details+'<section class="section"><h2>Another change');
 }
 if(route==='/privacy/'){
  html=html.replace('Beta 0.2.0 does not collect or transmit conversation bodies.', 'The extension does not transmit conversation bodies. Standard themes and the three Explorer routines do not inspect message text. Word Bites is a separate explicit opt-in that examines a bounded amount of visible assistant text locally, without saving or transmitting it.');
 }
 return html;
}
