# Okello Food storage migration architecture

## Ownership

`storage-migration-v1.js` is the sole owner of migration from `okello_food_tracker_v2` to `okello_food_tracker_v3`, later v3 schema normalisation, food-id canonicalisation, and recovery handling when the current v3 store itself is unreadable.

It must load before the Ghana catalogue, world catalogue, data layer and main tracker.

The migration contract is:

1. If a readable v3 store already exists, apply only required schema/id upgrades. A schema-current canonical store must be a byte-stable no-op.
2. If v3 is absent and a valid v2 store exists, create v3 once from the upgraded v2 state.
3. If both are absent, create a fresh v3 default state.
4. If v2 exists but is invalid and v3 is absent, create a safe default v3 but retain the original v2 key unchanged for recovery.
5. If v3 exists but is invalid, preserve its exact raw value in `okello_food_tracker_v3_quarantine_v1` before creating a safe working v3. Never silently overwrite unreadable current data.
6. Never delete the v2 key during this migration/recovery release. It remains a rollback/recovery copy.

The module exposes `window.OkelloStorageMigration` for diagnostics, food-id resolution and recovery actions. Normal application code reads and writes v3 only.

## Single-owner boundary

From v28 onward, `app.js`, `ghana-foods.js`, `world-foods.js` and `food-data-layer-v1.js` no longer read the legacy v2 key. They operate only on `okello_food_tracker_v3` after the migration module has run.

`storage-migration-v1.js` is therefore the only runtime source file permitted to name `okello_food_tracker_v2`. Any future schema migration must be added to the migration boundary rather than duplicated in catalogue, tracker or feature modules.

## Food identity aliases are not food relationships

The migration owns legacy aliases because durable state may contain old `foodId` values. An alias means **the same food under an old identifier**. It is safe to rewrite durable references to the canonical id without recalculating historical nutrition snapshots.

Current okro aliases include:

```text
okro ≡ ghana_okro_stew
ghana_okro_soup ≡ ghana_okro_stew
okro_base ≡ ghana_okro_stew_base
```

A `baseFoodId` is different. It means **a different food definition that the user may deliberately switch to**. That relationship belongs to the meal data contract, not the alias resolver:

```text
ghana_okro_stew --baseFoodId--> ghana_okro_stew_base
```

Do **not** write or implement the shorthand:

```text
okro -> ghana_okro_stew -> ghana_okro_stew_base
```

The two arrows would falsely imply one transitive identity chain. `resolveFoodId('okro')` must stop at `ghana_okro_stew`; it must never walk through `baseFoodId` to the base.

Canonicalisation may rewrite a historical log's `foodId`, recipe ingredient ids, template component ids, calibration evidence, co-occurrence references and other durable identity keys. It must not alter the log's stored `kcal`, `protein`, `fibre`, `grams`, `estimatedGrams`, piece provenance or timestamps.

## Corrupt v3 quarantine

The recovery quarantine handles the narrow case where `okello_food_tracker_v3` exists but is not a JSON object, for example invalid JSON or an array.

Before any safe default replaces that unreadable current value, the module stores the exact raw string in `okello_food_tracker_v3_quarantine_v1`. The normal quarantine format includes a capture timestamp and reason. Only after the quarantine succeeds does the module create a clean working v3. This prevents catalogue or tracker startup from becoming the component that destroys the last recoverable copy.

The quarantine path is also designed for a nearly full local-storage quota. It first tries to copy the damaged value without touching v3. If duplication fails, it temporarily frees the current key, retries the quarantine write and, if the metadata wrapper is too large, falls back to storing the exact raw value directly under the quarantine key. If every quarantine attempt fails, it restores the original v3 value and keeps the same raw value in memory for an immediate recovery download during that session.

A persistent recovery banner is shown while a quarantine record exists. It offers a recovery download, a shortcut to Backup controls and an explicit dismissal action. A successful restore does not automatically delete the quarantine. Recovery evidence remains available until the user deliberately dismisses it.

The quarantine store is exceptional recovery evidence, not active application state. It is intentionally not restored automatically and should never be treated as a normal tracker backup payload.

## Idempotence

Idempotence means more than producing the same logical result. A complete second pass must perform no storage write at all.

Two failure modes are guarded:

- repeatedly writing an already-equal value on every boot;
- reserialising an equivalent object because property order changed.

The migration therefore tracks actual schema/id mutations instead of using serialised-object equality as a write trigger. A store that already has the required schema and canonical ids is left byte-for-byte unchanged.

Auxiliary stores such as favourites are rewritten only when an alias is present. If multiple old/current ids collapse to one favourite, duplicates are removed so canonicalisation cannot leave multiple recommendation signals for the same food.

If a quarantine exists alongside a readable v3, required schema/id upgrades may still run, but the recovery warning remains until the quarantine is deliberately cleared.

## Verification cases

The branch test suite covers:

- schema-current canonical v3: byte-stable zero-write pass;
- older readable v3: required schema fields are established once, then the second pass performs zero writes;
- v2 only: v3 is created with durable state preserved;
- neither key: a fresh v3 default is created once;
- corrupt v3: original raw value is quarantined before safe defaulting;
- alias-only, canonical-only and overlap stores;
- favourites containing both alias and canonical ids collapse to one canonical favourite;
- the user's 2026-09-07 live-phone store shape, including the historical `okro` log;
- historical nutrition/amount snapshots remaining unchanged while `foodId` is canonicalised;
- storage unavailable: the application continues through its existing fallback behaviour.

## Removal rule

Do not remove `okello_food_tracker_v2` automatically until at least one verified release has run with centralised migration. Migration code must never delete the user's last recovery copy in the same release that changes ownership.
