# v54 — no invented targets in durable user data (candidate)

21 November 2026. This is a data-truth correction. Do not overwrite existing target values, force changes to older records or recalculate historical nutrition.

- A new user's calorie and protein targets start as null. Previously missing fields remain unknown rather than receiving 2300 kcal and 150 g protein values.
- Existing, explicitly stored values are preserved. Legacy 2300/150 values cannot be reliably distinguished from genuine selections in older records; there is no retrospective deletion.
- Calculations and history distinguish absent targets from numeric targets. Target-based Smart Portion does not manufacture an allowance. A recipe can still use a manually entered per-serving calorie budget without inventing a daily one.
- A returning user whose old diary has no valid targets must choose tracking-only or provide personal targets; a returning user with saved targets keeps them.
- The first-run header no longer displays 2,300 kcal as an initial placeholder.

Pass historical migration, app-write, browser (Chromium/WebKit), target-safety and full bundle tests before merge. Device verification and privacy/source gates remain outstanding.
