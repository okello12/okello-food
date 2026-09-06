# Okello Food backup architecture

Okello Food keeps personal data in several local browser stores. A backup is complete only if it preserves all of the stores that materially affect the user's history, personalisation, authored content and activity views.

## Current complete backup

`backup-v2.js` owns both plain JSON and encrypted backup/restore. The v2 bundle contains:

- `state` from `okello_food_tracker_v3` — targets, logs, custom foods, recipes, meal templates and weight history.
- `favourites` from `okello_food_favourites_v1`.
- `satiety` from `okello_satiety_v1` — hungry, comfortable and full feedback used by Personal Food Memory and Weekly Intelligence.
- `activity` from `okello_activity_v1` — activity goals, daily steps data, activity entries and preferences.
- `photoNotes` from `okello_photo_notes_v1` when that store contains data.

The current photo-meal capture flow only previews the selected photo with an object URL and passes the typed description into Quick Log. It does not persist the image itself, and the current `smart-v3.js` does not actively write `okello_photo_notes_v1`. The backup nevertheless preserves that store when present so user-authored notes from an older or future implementation are not silently discarded.

`okello_recipe_voice_draft_v1` is deliberately classified as disposable working state. It is only an unfinished Smart Pot text draft, not part of food history, a saved recipe or a learned preference. It is therefore not included in backups.

`okello_food_tracker_v3_quarantine_v1` is deliberately classified as exceptional recovery evidence rather than normal application data. It can contain the exact unreadable raw value of a damaged v3 store. It is not included in or automatically restored from normal backups because doing so would propagate corrupt state. The storage migration layer exposes a separate recovery download and keeps the quarantine until the user deliberately clears it after recovery.

## Formats

Plain backups use `format: okello-backup-v2`.

Encrypted backups use `format: okello-encrypted-v2`. The inner payload is the same complete v2 bundle. Encryption continues to use PBKDF2 with SHA-256 to derive an AES-GCM 256-bit key from the user's passphrase.

## Restore safety

Restore is intentionally replacement-based rather than merge-based. Before either a plain or encrypted backup writes anything, the app shows a confirmation naming the backup export date when it is available and explicitly warns that the food, weight and activity data already on the device will be replaced.

Older backups without an `exportedAt` value are labelled as older backups with the date unavailable rather than inferring a potentially misleading date from the file metadata.

Cancelling the confirmation leaves the current device data untouched.

## Backwards compatibility

Restore accepts the older plain state-only JSON format.

Encrypted restore accepts both `okello-encrypted-v1` and `okello-encrypted-v2`. Older encrypted files restore the data they contain without failing because favourites, satiety, activity or photo-note fields are absent.

Auxiliary stores are restored only when the matching field is present and valid, so importing an older backup never fails merely because a newer store did not exist yet.

## Ownership

Legacy export/import handlers still exist in `app.js` and `features-v1.js`, but `backup-v2.js` captures the relevant export/import events first and is the runtime owner of backup behaviour. Future cleanup can remove the legacy handlers once the app is refactored around a dedicated backup service.

## Rule

Any new local store that materially affects user history, recommendations, learned preferences, authored content or activity must either be added to the complete backup bundle or be explicitly documented as disposable cache, draft data or exceptional recovery evidence with its own recovery path.
