# Validation record — September 13, 2026

## Executed locally

- `npm run check`: 22 routes plus 404, 12 appearance files; 17 Node test groups passed.
- Offline Chromium fixture: theme changes, cat search, favorites, serif/size controls, 360/390/768/1440 layout and mobile menu/Escape.
- Visual review of desktop home, mobile home and a world showroom.

## Environment boundary

The local browser denied HTTP navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. The fixture rendered local HTML/CSS/SVG and used simulated location/history/storage; it did not prove HTTP loading, native browser storage, real downloads, CSP enforcement or deployed behavior. The offline check is supplementary, not a replacement for CI.

`tests/browser.py` is the actual HTTP suite committed for the GitHub runner. Its result must be read from GitHub Actions, not inferred from this document. No signed-in ChatGPT or installed-extension test is included in the website suite. No browser-overhead, accessibility certification or battery guarantee is claimed.

## Required before public promotion

Pass the HTTP CI job; verify a real hosted preview, headers and links; keyboard-check major flows; approve any public extension package; validate canonical origin and robots behavior; review operator disclosures. The extension user test remains a separate gate.
