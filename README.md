# ChatDrobe website

Static companion website for the ChatDrobe desktop Chrome extension.

ChatDrobe is positioned as a personal workspace layer for ChatGPT: original visual worlds, reading controls and local productivity tools, with optional premium Living World routines.

## Product routes

- `/` — product landing page
- `/themes/` — complete world catalog
- `/features/` — Free and Plus feature overview
- `/premium/` — Plus-preview worlds and Living World routines
- `/pricing/` — proposed Free vs Plus comparison
- `/how-it-works/` — extension behavior and local-tool model
- `/install/` — private beta install instructions
- `/go-to-market/` — internal launch-positioning page for beta review

The current Explorer collection contains 15 worlds: 11 proposed Free worlds and four Plus-preview worlds, with light/dark palette support.

## Commercial boundary

The private beta does not collect payment. Pricing is proposed only. Hosted checkout, server-verified entitlements, cancellation/billing management and final paid-service disclosures remain separate launch work tracked in Issue #6.

## Development

```bash
npm run build
npm test
npm run check
```

The site builds into `dist/`. Vercel should use the repository root, Framework Preset `Other`, and Output Directory `dist`; the build also tolerates a nested Vercel invocation directory by emitting `dist` where Vercel expects it.

## Privacy and product boundaries

The website is independent of the extension runtime. Appearance downloads contain display preferences only. The current website remains noindex by default until public launch readiness, brand/domain clearance, release URLs and commercial controls are explicitly configured.
