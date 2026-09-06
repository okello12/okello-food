# Okello Food storage migration architecture

## Ownership

`storage-migration-v1.js` is the sole owner of migration from `okello_food_tracker_v2` to `okello_food_tracker_v3` and of recovery handling when the current v3 store itself is unreadable.

It must load before the Ghana catalogue, world catalogue, data layer and main tracker.

The migration contract is deliberately small:

1. If a valid v3 store already exists, leave it untouched.
2. If v3 is absent and a valid v2 store exists, create v3 once from a normalised copy of v2.
3. If both are absent, create a fresh v3 default state.
4. If v2 exists but is invalid and v3 is absent, create a safe default v3 but retain the original v2 key unchanged for recovery.
5. If v3 exists but is invalid, preserve its exact raw value in `okello_food_tracker_v3_quarantine_v1` before creating a safe working v3. Never silently overwrite unreadable current data.
6. Never delete the v2 key during this migration/recovery release. It remains a rollback/recovery copy.

The module exposes `window.OkelloStorageMigration` for diagnostics and recovery actions. Normal application code reads and writes v3 only.

## Single-owner boundary

From v28 onward, `app.js`, `ghana-foods.js`, `world-foods.js` and `food-data-layer-v1.js` no longer read the legacy v2 key. They operate only on `okello_food_tracker_v3` after the migration module has run.

`storage-migration-v1.js` is therefore the only runtime source file permitted to name `okello_food_tracker_v2`. Any future schema migration must be added to the migration boundary rather than duplicated in catalogue, tracker or feature modules.

## Corrupt v3 quarantine

v29 adds a recovery quarantine for the narrow case where `okello_food_tracker_v3` exists but is not a JSON object, for example invalid JSON or an array.

Before any safe default replaces that unreadable current value, the module stores the exact raw string in `okello_food_tracker_v3_quarantine_v1`. The normal quarantine format includes a capture timestamp and reason. Only after the quarantine succeeds does the module create a clean working v3. This prevents catalogue or tracker startup from becoming the component that destroys the last recoverable copy.

The quarantine path is also designed for a nearly full local-storage quota. It first tries to copy the damaged value without touching v3. If duplication fails, it temporarily frees the current key, retries the quarantine write and, if the metadata wrapper is too large, falls back to storing the exact raw value directly under the quarantine key. If every quarantine attempt fails, it restores the original v3 value and keeps the same raw value in memory for an immediate recovery download during that session.

A persistent recovery banner is shown while a quarantine record exists. It offers:

- a download of the quarantined raw value as a recovery file;
- a shortcut to the Backup controls so a known-good backup can be restored;
- an explicit dismissal action that deletes the quarantine only after a warning and confirmation.

A successful restore does not automatically delete the quarantine. Recovery evidence remains available until the user deliberately dismisses it.

The quarantine store is exceptional recovery evidence, not active application state. It is intentionally not restored automatically and should never be treated as a normal tracker backup payload.

## Idempotence

Running the migration repeatedly is safe. Once v3 exists, the v2 migration becomes a no-op and does not recopy or overwrite from v2.

If a quarantine exists alongside a valid v3, the current v3 remains untouched and the recovery warning continues to surface until the quarantine is deliberately cleared.

## Verification cases

The release should be checked against these states:

- valid existing v3 plus v2: v3 is unchanged;
- v2 only: v3 is created with targets, logs, custom foods and recipes intact;
- neither key: a fresh v3 default is created;
- corrupt v2 with no v3: default v3 is created and corrupt v2 is retained;
- corrupt v3 with no quarantine: exact raw v3 is quarantined first, then safe v3 is created;
- corrupt v3 when duplicate storage would exceed quota: the move/raw-only fallback preserves the damaged value before safe v3 is created;
- valid v3 plus an existing quarantine: v3 remains unchanged and recovery remains pending;
- repeated startup after migration: v3 remains unchanged;
- storage unavailable: the application continues through its existing in-memory/default fallbacks.

## Removal rule

Do not remove `okello_food_tracker_v2` automatically until at least one verified release has run with centralized migration. Migration code must never delete the user's last recovery copy in the same release that changes ownership.
