# Website release and review

## Review stack

1. `website/01-foundation` -> `main`: standalone website and original catalog.
2. `website/02-theme-experience` -> foundation: filters, favorites and showroom.
3. `website/03-launch-readiness` -> theme experience: release controls, SEO, security and CI.

Review and merge in order. After each dependency merges, retarget the next PR to `main` and recheck its diff and CI. Do not delete dependency branches prematurely. No PR is auto-merged. The final branch contains the complete website.

## Local checks

```sh
npm run check
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/browser.py
```

The HTTP browser suite starts and stops its own server on port 4174. It exercises the Vercel headers locally, visits every route, checks downloads/imports, URL round trips, favorites, mobile layout and no-JavaScript fallbacks. Artifacts go to ignored `test-results/`. CI installs Linux browser dependencies. No deployment or payment secrets are needed.

## Vercel connection (not yet performed)

Import this repository with framework Other, root `.`, build `npm run build`, output `dist`. The checked-in configuration supplies these defaults. Use Git integration for PR previews. Confirm real preview URLs, headers, navigation and downloads before promoting any deployment. A config file alone is not a deployment.

`SITE_URL` is the approved bare HTTPS production origin. `SITE_INDEXABLE=true` enables indexing only when `VERCEL_ENV=production` as well. Preview builds stay noindex regardless of the production flag. Without an approved origin there is no invented canonical URL or sitemap. With an origin, unique canonical URLs and a sitemap are generated. The 404 page is always noindex.

## Extension distribution gate

The website does not contain or rebuild extension source. Keep using the separately supplied 0.2.0 test package. Appearance JSON downloads are functional now and are not installers.

Only after owner approval and real-browser extension testing:
- Attach the approved extension ZIP to a real release under this repository.
- Download it independently, inspect its contents/version and compute SHA-256.
- Set `downloadUrl` and `downloadSha256` together in `site.config.json`.
- Optionally set `storeUrl` to the actual approved Chrome Web Store detail URL.
- Verify the link, contents and hash on a hosted preview before publishing.

Build validation restricts origins/paths and requires a hash; it cannot establish that a remote file exists or that its bytes match the declared hash. Those are mandatory release checks. Never copy the fixture hash from the unit tests into release configuration.

## Product and commercial gates

Clear brand/domain/art rights. Confirm final operator/support details and review commercial terms before charging. The current beta-use page is not a complete paid-service agreement. Checkout, licensing, payment webhooks, cancellation and paid entitlements remain separate backend work. No current page collects payment or claims these exist.

## Security and support

CSP restricts scripts to this origin and prevents framing. Inline style attributes remain permitted for bounded reading controls; inline JavaScript does not. No application analytics or external fonts are loaded. Local server mirrors these headers for CI, but deployed header behavior still needs inspection.

Issue reports are public. Never paste private chats, API keys or personal screenshots. Configure a verified private security-reporting channel before soliciting vulnerability reports; no private support address has been invented.
