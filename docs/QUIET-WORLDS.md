# Quiet Worlds — v0.5.2 private refinement

The user's requirement is atmosphere without interruption: no extra information over the chat, natural small companion actions, and a productive workspace first.

## Extension artifact supplied separately

The v0.5.2 runtime ZIP updates the three existing Living environments, not the static theme catalog or payments. The cat can blink (0.9 seconds), groom/lick a paw (4.2 seconds), scratch an ear (2.8 seconds) and settle. The drone has a small in-place inspection (4 seconds). There is no walking across the conversation or reading/deleting words in these routines.

A new pure policy allows one short action only after at least 45 seconds of no input, with at least two minutes between actions. At five minutes of inactivity the companion rests and the action timer stops. This is occurrence-only detection, not keystroke content, conversation inspection, saved activity history or analytics. Mouse/keyboard/scroll events abort a current pose and keep ambient motion quiet for ten seconds after input. Composition, supported streaming controls, focus sessions, reduced motion, hidden/unfocused tabs and unsafe geometry also suppress the motion. Unknown ChatGPT controls still require compatibility testing.

The overlay's caption nodes are removed, not replaced. No world name, chapter label, session-complete badge, progress meter, rewards or new controls are added over the conversation. The existing side panel retains settings and focus details. Ambient rain/snow/aurora is softer; landscapes and planets move more slowly; repeated traffic/craft/hover effects and entrance fades are removed. Focus completion remains a timer-state transition, not an overlay announcement.

Motion defaults remain off, light defaults remain intact, and there are no additional browser permissions, network calls, signing keys, Stripe configuration or account changes. All 15 static themes and three Living worlds remain. The wrapper preserves the base v0.5.1 scene and replaces only the companion rig and motion policy. The existing page adapter continues to own safe placement and suppress scenes with insufficient space.

## Website PR scope

This PR reuses the same quiet-scene wrapper as the separately supplied v0.5.2 extension. It keeps the original model/scene snapshots and their hash checks. The wrapper and stylesheet load only after interaction. Extra companion demonstrations live in the existing expandable Session moment selector, outside the fictional conversation. They are explicit immediate demo actions, not real idle timing or a live ChatGPT integration. The website also hides its chapter badge inside the preview, retaining timeline information below it.

The body renderer and CSS use the existing same-origin policy without enabling inline code or remote assets. Incremental caps: 3.5 KB JavaScript and 4 KB CSS after interaction. The original extension ZIP is not modified in place or remotely updated. The website PR does not change pricing, payment enablement, API routes, authentication, store status, catalog counts or future-world promises.

## Verification boundaries

The separate extension was tested locally using Node contracts and actual Chromium with representative page markup and mocked extension messaging. Tests cover finite actions, cooldowns, input/composition/streaming suppression, hidden/reduced-motion cleanup, no label nodes, protected message/draft/disclaimer content and safe geometry. This is not proof of installed Chrome IPC, a signed-in ChatGPT session or battery usage. See the delivered build report for exact executed counts.

The website's existing CI retains pricing, billing, PostgreSQL, deployment artifacts and browser checks. New tests bound the lazy additions and check finite animations. Check the PR's actual status before merging; this document does not assert an unrun CI pass. The launch sequence remains payments, extension hardening, launch, then Gemini.
