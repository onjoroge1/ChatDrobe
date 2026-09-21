## Scope
What changes? Does this depend on another PR?

## Validation
- [ ] `npm run check`
- [ ] `python tests/browser.py` or explain why blocked
- [ ] Mobile and keyboard checks
- [ ] No invented release, pricing, compatibility or payment claims
- [ ] Extension changes pass `npm run check:extension`; review ZIP version matches `release.json`
- [ ] No private data; remaining native-browser/provider checks are stated explicitly

## Release impact
State configuration, documentation or follow-up gates. Do not equate a merge with deployment.
