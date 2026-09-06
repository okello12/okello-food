# Okello Food backup architecture

Okello Food keeps personal data in several local browser stores. A backup is complete only if it preserves all of the stores that materially affect the user's history, personalisation and activity views.

## Current complete backup

`backup-v2.js` owns both plain JSON and encrypted backup/restore. The v2 bundle contains:

- `state` from `okello_food_tracker_v3` — targets, logs, custom foods, recipes, meal templates and weight history.
- `favourites` from `okello_food_favourites_v1`.
- `satiety` from `okello_satiety_v1` — hungry, comfortable and full feedback used by Personal Food Memory and Weekly Intelligence.
- `activity` from `okello_activity_v1` — activity goals, daily steps data, activity entries and preferences.

## Formats

Plain backups use `format: okello-backup-v2`.

Encrypted backups use `format: okello-encrypted-v2`. The inner payload is the same complete v2 bundle. Encryption continues to use PBKDF2 with SHA-256 to derive an AES-GCM 256-bit key from the user's passphrase.

## Backwards compatibility

Restore accepts the older plain state-only JSON format.

Encrypted restore accepts both `okello-encrypted-v1` and `okello-encrypted-v2`. Older encrypted files restore the data they contain without failing because satiety or activity fields are absent.

Auxiliary stores are restored only when the matching field is present and valid, so importing an older backup never fails merely because a newer store did not exist yet.

## Ownership

Legacy export/import handlers still exist in `app.js` and `features-v1.js`, but `backup-v2.js` captures the relevant export/import events first and is the runtime owner of backup behaviour. Future cleanup can remove the legacy handlers once the app is refactored around a dedicated backup service.

## Rule

Any new local store that materially affects user history, recommendations, learned preferences or activity must either be added to the complete backup bundle or be explicitly documented as disposable cache data.