# Curated world artwork production

One locked DiceBear package now supplies selected vector components for three
worlds. These are authored compositions, not random avatars generated at runtime.

| World | Collection | Selected components |
| --- | --- | --- |
| Tokyo | Sprouts | Palm/cylinder and sprout/bowl plants in jade and terracotta. |
| Train | Landscape | Three organic hill contours, mapped to the existing journey and lighting palettes. The original mountains, trees, cottage and carriage remain. |
| Starship | Planets | Terra, cratered and banded surfaces for Earth, Moon and Jupiter, plus soft shading. Asteroid and deep-space stages remain; no Saturn rings are added to Earth or Jupiter. |

The original articulated ChatDrobe cat remains shared by Tokyo, Train and Natural
Cat. DiceBear does not supply its rig or finite motion clips. Lottie remains the
separate Tokyo steam pilot; these new world components do not load another player.

## Reproduce the checked-in artwork

Use Node 22, then run from the repository root:

```sh
npm --prefix tools/artwork ci --ignore-scripts
npm --prefix tools/artwork run generate
```

Normal website/extension builds need neither this dependency nor network access.
Only selected geometry and its small assembly modules ship. Extension and website
use the same `quiet-scene.mjs` world. No CDN request, avatar API, source-SVG
injection, runtime random generation or upstream animation stylesheet is included.

The generator reads exact locked `@dicebear/styles@10.6.0` definitions, requires
CC0 for each chosen collection, resolves palette colors, prefixes SVG IDs and
rejects unapproved tags, attributes and external references. It strips only the
Planets `dbpa-surface` class, whose upstream animation is deliberately omitted.
Only inert SVG shapes, local clipping and the required local radial gradient are
allowed. All other unknown classes or animation primitives fail generation.

- `art-sources.json`: Tokyo source definition, selections and output checksum.
- `world-art-sources.json`: separate Landscape and Planets definitions, selections,
  licenses, source checksums and shared output checksum.
- `ARTWORK-LICENSE.txt`: notices packaged alongside the generated artwork.

Train's original landscape motion container, stage transitions and day/dusk/night
variables remain in charge. Its paths extend from x=-1050 to x=2050 in the 1000-wide
scene, covering the existing 100px pan without revealing the edge. Static city
window rectangles are consolidated into one same-paint path, as in Tokyo, to keep
all worlds within the unchanged 320-node scene budget.

## Art direction and expansion

- Judge the cat silhouette and world composition at compact size before closeups.
- Preserve the native conversation/composer clearance and quiet-motion policy.
- Review full, portal and compact habitats; all journey chapters; day/dusk/night;
  and Still/reduced motion. Check SVG references and node budgets alongside paint.
- Do not count an installed collection as a finished visual integration. The same
  authoring package also contains Constellation, Critters and Open Peeps definitions;
  they are not compiled into these worlds. Each future selection needs its own
  provenance, license and visual review.
- A collection's artwork license is separate from DiceBear's runtime MIT license.
  Updating the authoring dependency requires regenerating and reviewing the diff.

Primary source URLs are recorded with the shipped manifests:
https://www.dicebear.com/styles/sprouts/
https://www.dicebear.com/styles/landscape/
https://www.dicebear.com/styles/planets/
https://www.dicebear.com/licenses/
https://github.com/dicebear/styles
