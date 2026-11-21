# v53 — explicit render ownership (candidate)

21 November 2026. Builds on tested v52 stabilisation. No new product features, data keys, hidden targets, catalogue changes, external services or migration.

- app.js emits explicit `okello:today-rendered`, `okello:food-library-rendered`, `okello:food-selects-rendered` and `okello:food-suggestions-rendered` after owned renders. Listeners do not infer a render from unrelated DOM changes.
- Today enhancements (measurement choice, evidence/portion badges, repeat/edit controls, countable labels and header shortcuts) subscribe to the completed-render event rather than observing Today rows and rewriting each other.
- The global-first, target-safety, catalogue-alias and scanner modules no longer observe the entire document body for generic mutations; they listen to named owner events, with startup reconciliation.
- Existing compatibility adapters and targeted observers stay in place where ownership has not yet migrated. This is a narrow step towards a single UI owner, not a framework rewrite.

**Acceptance gate:** both browser engines must pass genuine touch-entry and onboarding tests; all existing regressions must pass. Measure idle mutations, first-log, tab switching, and scan launch on a real iPhone. Do not claim this release resolves all architectural debt. The `okello_food_tracker_v3` diary and historical snapshots remain untouched.
