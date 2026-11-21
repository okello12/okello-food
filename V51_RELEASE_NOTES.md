# v51 — integrity and maintenance

Build id: `v51-static-20261121-integrity-1`

## Changes proposed
- Reflection retains unclassified amount provenance as distinct from explicitly estimated quantities.
- Plate-pair observations count distinct identified plates and include an explicit denominator; duplicate food rows on a plate are not extra occurrences.
- The diary, amount-quality summaries, activity, meal entry, onboarding, forecasts and reflection use local calendar dates. Existing persisted date keys, snapshots, IDs, timestamps and backup formats are not rewritten. Historical entries near midnight may remain under their original pre-v51 UTC date; no automatic rebucketing or inference of historic timezone is attempted.
- README and manifest describe global food literacy, local-first use and opt-in targets. The new versioned shell is aligned with bootstrap and service-worker assets. Older entry pages remain available for existing installs.
- Regression additions cover unclassified provenance, duplicated food rows and reused plate IDs on different dates, exact pair denominators, local day keys across midnight and DST.

## Release gates
CI must pass before merging. Verify live build alignment and a real-device meal and history smoke test after deployment. This is not scientific validation of the catalogue or public-launch approval.

No accounts, cloud diary, personal-data migration, professional workflow, new remote service or navigation redesign.
