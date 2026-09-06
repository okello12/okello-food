# Okello Food data architecture

Okello Food uses a shared runtime food-data layer before the tracker boots.

Built-in regional catalogues load first, then `food-data-layer-v1.js` applies the canonical schema, normalises managed foods, removes known duplicates, validates nutrition and portion fields, builds region/source indexes, and exposes diagnostics through `window.OkelloFoodData`.

The main tracker then exposes `window.OkelloFoodCatalog`, which is the single read API used by smart features. `smart-v3.js` reads from that catalogue and does not contain its own nutrition table.

## Canonical managed-food schema

Required fields: `id`, `name`, `cat`, `kcal`, `protein`, `fibre`, `portion`.

Nutrition values use a per-100 g basis. Portion, min and max values use grams. Managed catalogue ids are namespaced with `ghana_` or `world_`. Region, source, quality and data schema version are normalised metadata.

Mixed dishes can remain estimates. User recipes and packet/barcode data should override generic estimates when better information is available.

## Validation

The shared layer checks numeric ranges, required fields, categories, min/max consistency and duplicate ids. It also records semantic duplicate-name warnings without automatically deleting legitimate regional variants.

The Settings screen includes a Catalogue Integrity card showing the current managed-food count, schema errors and id collisions.
