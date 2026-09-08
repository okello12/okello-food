# Okello Food network and storage inventory

Version 1 · 8 September 2026

This register is the source of truth for the pre-launch beta's device-storage and network boundary. New network destinations or durable stores require an explicit update to this file and the v46 due-diligence regression tests.

## Network destinations

| Destination | Trigger | Data intentionally sent | Required for core offline logging? |
| --- | --- | --- | --- |
| GitHub Pages (`okello12.github.io`) | Loading or updating the app | Normal web request metadata and requested static files | No, after a successful cached install |
| Open Food Facts (`world.openfoodfacts.org`) | User chooses a barcode lookup or online packaged-product search | Barcode or typed product-search term plus normal request metadata | No |
| Open Food Facts product-image hosts | A returned product image is displayed | Normal image request metadata | No |
| jsDelivr (`cdn.jsdelivr.net`) | Initial barcode-scanner dependency load if not already cached | Normal library request metadata | No |

No advertising network or third-party analytics service is intentionally used in the v46 beta.

The in-app Web Speech Recognition feature is disabled in v46. Users may still use device/keyboard dictation provided by their operating system; that is outside the Okello Food application boundary.

## Durable localStorage stores

| Key | Classification | Backup v3 |
| --- | --- | --- |
| `okello_food_tracker_v3` | Durable: food diary, recipes, custom foods, weight history, templates, learning state | Included |
| `okello_food_favourites_v1` | Durable preference | Included |
| `okello_satiety_v1` | Durable feedback linked to meals | Included |
| `okello_activity_v1` | Durable activity history and goals | Included |
| `okello_photo_notes_v1` | Durable user note data if present | Included |
| `okello_shopping_products_v1` | Durable saved shopping/product data | Included |
| `okello_first_run_v44` | Durable first-run/profile preference | Included |
| `okello_beta_feedback_v1` | Durable local beta evidence | Included |
| `okello_recipe_voice_draft_v1` | Recoverable draft | Included |

## Deliberately disposable / diagnostic state

The complete backup deliberately excludes transient debug/runtime keys such as scanner debug state, scanner last-error details, touch fallback counters and Smart Meal runtime traces. They are not user diary records and are not required to reconstruct the user's food history.

## Change rule

A feature that adds a new remote service, account, server-side store or recurring per-user API cost must not be merged as an incidental implementation detail. It needs an explicit architecture/privacy/cost decision recorded in the repository first.
