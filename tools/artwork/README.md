# Tokyo artwork production

The first curated world keeps the existing Tokyo city, reading desk and natural
cat, and adds two calm potted plants from DiceBear's CC0 Sprouts collection. The
companion is still ChatDrobe's original articulated cat; these plants are props,
not a replacement avatar. This keeps one consistent warm, botanical palette.

## Reproduce the checked-in artwork

Use Node 22, then run from the repository root:

```sh
npm --prefix tools/artwork ci --ignore-scripts
npm --prefix tools/artwork run generate
```

Normal website/extension builds need neither this dependency nor network access.
Only `tokyo-plant-art.mjs` (static curated SVG geometry) and `tokyo-nook.mjs` (DOM
assembly) ship. Both extension and website use the same `quiet-scene.mjs` world.
There is no CDN request, avatar API, inline source-SVG injection, random generation
at page load, or upstream animation running beside the companion scheduler.

The generator reads the exact locked `@dicebear/styles@10.6.0` definition, checks
the CC0 dedication, selects palm/cylinder and sprout/bowl components, resolves
colors, prefixes SVG IDs, and rejects unapproved tags, attributes and external
references. It writes the output checksum and source checksum to
`browser-extension/extension/living/art/art-sources.json`.

## Art direction and expansion

- Leaves use muted jade; pots use terracotta/cream, with day/dusk/night variants.
- Retain the companion's silhouette and individual finite actions.
- Keep decorative props outside reading/composer areas using the scene placement.
- Before another world, review the art in full, portal and compact habitats, at
  day/dusk/night and with Still/reduced motion. Check SVG ID resolution and node
  budgets as well as appearance. Do not count library adoption as visual approval.
- Add a new collection only with its own source/version/license record. The
  DiceBear runtime's MIT license does not license every artwork collection.

Primary sources verified for this integration:
https://www.dicebear.com/styles/sprouts/
https://www.dicebear.com/licenses/
https://github.com/dicebear/styles

The authoring dependency is isolated from website/server production dependencies.
Updating it requires regenerating and reviewing the artwork diff and licenses.
