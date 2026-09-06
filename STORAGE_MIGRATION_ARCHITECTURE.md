# Okello Food storage migration architecture

## Ownership

`storage-migration-v1.js` is the runtime owner of migration from `okello_food_tracker_v2` to `okello_food_tracker_v3`.

It must load before the Ghana catalogue, world catalogue, data layer and main tracker.

The migration contract is deliberately small:

1. If a valid v3 store already exists, leave it untouched.
2. If v3 is absent and a valid v2 store exists, create v3 once from a normalised copy of v2.
3. If both are absent, create a fresh v3 default state.
4. If v2 exists but is invalid and v3 is absent, create a safe default v3 but retain the original v2 key unchanged for recovery.
5. If v3 exists but is invalid, preserve it rather than silently replacing potentially recoverable user data.
6. Never delete the v2 key during this migration release. It remains a rollback/recovery copy.

The module exposes `window.OkelloStorageMigration` for diagnostics only. Normal application code should read and write v3.

## Idempotence

Running the migration repeatedly is safe. Once v3 exists, the migration becomes a no-op and does not recopy or overwrite from v2.

## Legacy readers

Several older modules still contain `current || legacy` fallback reads. From v28 onward those branches are dormant in normal startup because the migration owner runs first and guarantees a v3 store whenever storage is usable.

They are retained for one compatibility release rather than rewriting four mature catalogue/state modules at the same time as the migration boundary changes. This keeps the migration release narrow and recoverable.

The next storage cleanup can remove those dormant v2 references after v28 has been verified on existing v3 users, v2-only migration, fresh installs and corrupt-legacy recovery. At that point `storage-migration-v1.js` will be the only source file permitted to name `okello_food_tracker_v2`.

## Verification cases

The release should be checked against these states:

- valid existing v3 plus v2: v3 is unchanged;
- v2 only: v3 is created with targets, logs, custom foods and recipes intact;
- neither key: a fresh v3 default is created;
- corrupt v2 with no v3: default v3 is created and corrupt v2 is retained;
- repeated startup after migration: v3 remains unchanged;
- storage unavailable: the application continues through its existing in-memory/default fallbacks.

## Removal rule

Do not remove `okello_food_tracker_v2` automatically until at least one verified release has run with centralized migration. Migration code must never delete the user's last recovery copy in the same release that changes ownership.
