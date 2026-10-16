# v48 — housekeeping release

Build id: `v48-static-20261016-housekeeping-1`
Runtime modules: 58 (was 59; bridge removed)
Tests: 35 passing, all in CI

No user-facing feature changes. No data migration. Nutrition snapshots,
piece provenance, backups and personal memory are untouched.

## What changed

**Issue #12 closed.** `first-run-v44.js` no longer carries 2,300 kcal /
150 g protein anywhere, and its onboarding `finish()` merges into the
shared profile instead of overwriting it. `target-safety-bridge-v47.js`
is removed; the two behaviours it still owned (releasing the first-paint
guard, blanking Settings inputs in tracking-only mode) now live in
`target-safety-v46.applyMode()`, the module that owns the target decision.

**Dead code removed.** `amount-quality-v1/v2`, `food-data-layer-v1`,
`product-data-v1`, `bootstrap-v13/v15`. `backup-v2.js` and
`countable-servings-v45.js` are kept under `fixtures/v45-shipped/` as
SHA-pinned inputs to the v45→v46 migration test; they are not loaded.

**Tests consolidated.** `bundle-v41..v47.test.js` → one version-agnostic
`bundle.test.js` that reads VERSION from the bootstrap and asserts
alignment, cache parity, zero orphan modules and load order.
`static-entry-v47.test.js` → `static-entry.test.js`, same treatment.
`target-safety-v47.test.js` → `target-safety-v48.test.js`.

**Snapshot invariant now enforced.** `snapshot-invariants-v1`,
`category-rules-v1` and `product-data` were browser-only harnesses that
no workflow ran. `test-shim/` lets them run under node; all three are
now in `v46-due-diligence.yml`. The rule that catalogue changes never
re-price history finally has CI behind it.

**Governance docs merged.** `PRIVACY_DPIA_DRAFT.md`,
`ICO_FEE_ASSESSMENT_INPUTS.md`, `EXTERNAL_LAUNCH_WORKPACK.md` from the
8 September governance branch.

**Entry shell.** `manifest.webmanifest` → `./app-v48.html`. `recovery.html`
redirects there. `app-v47-safe.html` and `app-v47.html` are retained so
already-installed icons keep resolving; navigation is network-first with
the v48 shell as offline fallback.

## After merging

Delete the 27 fully-merged remote branches (listed in the PR). This
session could not do it: branch deletion is blocked by policy here.
