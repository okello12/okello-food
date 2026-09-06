# Okello Food intelligence architecture

## Goal

When more than one food could match what the user means, do not choose only by text. Rank the match and the quality of the nutrition source together.

## Source priority

1. **User recipe** — a recipe the user actually built from ingredients and finished-pot weight.
2. **Package / barcode** — product-specific nutrition from the exact packaged food.
3. **User saved food** — a food the user entered and chose to keep.
4. **Curated reference / regional catalogue** — reference foods and curated Ghanaian or world entries.
5. **Estimated mixed dish** — useful when a recipe varies and there is no more specific source.
6. **Restaurant estimate** — deliberately lowest confidence because portion, oil and preparation can vary substantially.

Text relevance is evaluated before source trust. This prevents a loosely matching personal recipe from beating an exact branded product name. Source priority then resolves close matches.

## Runtime layers

`food-data-layer-v1.js` validates and normalises managed catalogue entries.

`app.js` exposes the canonical food catalogue and nutrition calculator.

`food-intelligence-v1.js` wraps that catalogue with ranked search, source classification, confidence labels, personal-use signals and restaurant fallbacks. It does not duplicate nutrition values.

`search-intelligence-v1.js` makes the global search source-aware and labels results by source and confidence.

Smart features consume the same catalogue facade, so natural-language logging, Ask Okello and meal composition inherit the same source preference rules.

## Rules

* Never silently turn an estimated dish into an exact value.
* A user's own measured recipe should override a generic version of that dish when the names genuinely match.
* An exact barcode is authoritative for the packaged product being scanned, subject to checking obviously bad database data.
* Personal usage and favourites may break close ties, but should not overpower a clearly better text match.
* Restaurant estimates keep ranges visible rather than implying false precision.
* New regional catalogue files may grow independently, but they must pass through the common schema and intelligence layers.
