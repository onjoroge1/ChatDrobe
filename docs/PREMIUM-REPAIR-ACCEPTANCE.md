# Premium experience repair: 0.8.0

This PR addresses the September 21, 2026 audit of the 0.7.0 runtime and website commit `362e03dda35bbe866a01cc232a60f71fe465e543`. It is a review build, not a declaration of launch readiness.

## Traceability

The imported baseline came from `chatdrobe-extension-v0.7.0-source.zip`, SHA-256 `9e76a86323ff83381e47271f4a8f4c3e008827c52a32a5c63821353aea049f42`. Its runtime matched `chatdrobe-v0.7.0-load-unpacked.zip`, SHA-256 `51f02831896ca3e0ed0a552013a25293949417eb79b2706a7d34a9c3d93fb763`. The original archive lives outside this repository. Future review packages are generated from the committed runtime and checked byte-for-byte against their source before a checksum is emitted.

## Repair scope

| Audit failure | Repair and evidence required |
| --- | --- |
| Extension outside the repository; website describes another version | Runtime, tests and build checked in; root release metadata; CI review ZIP; website build reads the same version. |
| World selection leaves another engine active; motion needs extra activation | Atomic experience operation; one Worlds gallery and motion choice; reducer/worker regressions. |
| Premium cards promise a different palette | Gallery uses the selected appearance variant. |
| World saved but absent in common layouts | Measured safe reading/composer geometry, compact margin fallback, explicit blocked state when no safe margin remains. |
| Success describes storage rather than visible state | Content-script diagnostics, applied revision and visibility/motion reasons. |
| Presets/imports lose world and motion | Full appearance state round-trips; explicit backup restore; page-text consent is never imported. |
| Premium upgrade forgets requested behavior | Bounded full pending appearance reapplied after signed access verifies. |
| Account page falsely declares this installation ready | Account-side approval described separately; extension must verify its own signed access. Valid pending codes survive auth page switching. |
| Transient429 erases valid proof | Keep the existing valid proof until its original signed expiry; permanent authentication failures revoke. |
| One invalid/over-quota actor consumes shared refresh capacity | Validate and enforce actor quota before shared work quota, with service-level adversarial tests. |
| Retried Checkout parameters become invalid | Versioned durable request parameters and bounded identical-key retries; old requests keep their original contract or fail closed. |

## Checks that still block public paid launch

These are required evidence, not passing tests inferred from mocks. Record the exact commit, Chrome version, date, account tier and screenshot/trace for each run. Never include credentials or customer conversation content.

1. **Installed-extension flow.** Load the packaged artifact into supported desktop Chrome. Use a clean Free profile and an authorized Plus test account. Apply every Living World and natural companion in Still/Subtle/Playful; then switch back to a Free theme. Confirm one experience, correct palette, correct status, and preserved unsent draft. Repeat after service-worker suspension/restart, page reload and browser restart.
2. **Real ChatGPT layout.** Use the current signed-in page at 1280, 1440 and 1920px, with both ChatGPT and Chrome side panels open/closed, short/long conversations, and 100/125/150% zoom. Verify a displayed scene never covers actual messages, the composer or native controls. Where no margin exists, the panel must say blocked and offer a useful recovery. Unsupported layout detection must fail visibly rather than claim success.
3. **Motion and accessibility.** Test OS reduced motion, page focus, selected text, typing/composition, streaming, voice/media, Quiet Focus and keyboard-only controls. Observe the full idle schedule, then return to input. Confirm timers stop on disposal/backgrounding and no delayed burst occurs. Measure CPU, memory and battery impact before setting a performance claim.
4. **Paid account lifecycle.** With real Stripe sandbox objects and real configured sign-in delivery, verify new purchase, interrupted checkout, webhook replay/delay, portal cancellation, renewal, refund policy, expiry, refresh429, server outage and reconnection after device-link expiry. Existing automated provider mocks and real PostgreSQL tests do not prove this integration. Live billing is intentionally rejected by current code and needs a separately reviewed implementation/configuration.
5. **Migration and local recovery.** Update an existing0.7.0 installation in the same directory with notes, bookmarks, prompts and presets. Verify preserved account identity and data. Restore exported backups in another test profile, including malformed/oversized files. Confirm neither appearance import nor full restore enables page-text sampling. Website account recovery must not imply recovery of local-only data.
6. **Distribution and honest purchase story.** Decide the supported browser/viewport policy, publish an approved package/store URL with matching checksum, complete store/privacy/accessibility review, configure email sign-in and support, and reconcile all paid claims with demonstrated behavior. Do not enable indexing/payment conversion on the strength of this PR alone.

## Product decisions left explicit

- Entitlements remain short-lived; there is no new offline grace. A valid token survives a transient error but access still expires at the signed deadline. A product decision to allow longer offline access requires a reviewed server-side entitlement policy.
- Device links can expire and require reconnection. This PR does not silently extend their lifetime.
- Safe placement takes priority over decoration. At sufficiently narrow widths there may be no safe scene position. Blocked status is part of the supported behavior; native layout testing must determine the documented minimum viewport.
- Playful permits more involved idle actions; it does not mean constant movement. Quiet gaps and accessibility/activity protections remain.
- Local data is not cloud-synced. Backups are the recovery path; account sign-in restores access, not notes.

## Review order

Review the changes against the imported0.7.0 baseline as well as Git's added files. Start with `prefs.js`, `core.js`, `background.js` and `workspace.js`, then `boot.js`/`living/engine.mjs`/`model.mjs`, access refresh, backend idempotency/quotas, and website connection flow. The review ZIP is not a substitute for inspecting source. Old website-only motion PRs should be reconciled before merging to avoid restoring stale renderer copies.
