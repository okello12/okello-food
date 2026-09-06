# Product data architecture

Okello Food uses barcode product data for two different jobs: filling the packaged-food form and helping with shopping decisions. These consumers must share one product-data boundary before the Personal Shelf is expanded.

## Core rule

Open Food Facts values are external observations, not defaults. Missing values stay missing.

The product-data service must return `null` for an absent or unusable nutrient value. It must never turn an absent protein, fibre, calorie, sugar, saturated-fat or salt value into zero.

A product assessment may say that the available data is incomplete. It must not manufacture a poor score from missing data.

## Planned shared service

`product-data-v1.js` should become the single runtime owner of Open Food Facts product retrieval and normalisation.

It should:

- accept a barcode and perform one product request;
- deduplicate concurrent requests for the same barcode;
- normalise the response into one stable product shape;
- preserve missingness explicitly;
- expose source and checked-at metadata;
- calculate derived ratios only when their inputs are present and valid;
- return pack serving data separately from personal portions;
- avoid assigning a product category unless the category source is dependable enough for the consumer using it.

Both the legacy packaged-food form and `shopping-v1.js` should consume this same normalised result. The current v36 double-request arrangement is an accepted temporary compromise only until this service is introduced.

Do not build the Personal Shelf on top of two independent Open Food Facts parsing paths.

## Normalised product shape

The shared shape should support at least:

- `code`
- `name`
- `brands`
- `image`
- `servingG`
- `kcal100`
- `protein100`
- `fibre100`
- `sugar100`
- `saturatedFat100`
- `salt100`
- `proteinPer100Kcal`
- `fibrePer100Kcal`
- `source`
- `sourceCheckedAt`
- `completeness`

Derived values such as protein per 100 kcal are `null` whenever calories or the relevant nutrient are missing, or when calories are not positive.

## Amount meanings must stay separate

A scanned product can expose three different amounts and they must never be conflated:

1. **Pack serving** — manufacturer / product-database figure. Use Open Food Facts `serving_quantity` when valid; otherwise no pack serving is known.
2. **Smart Portion** — amount suggested from the user's current calorie and meal context.
3. **Your usual** — amount learned from the user's own logs after the normal Personal Food Memory threshold is met.

For a new product, `Your usual` is blank. A pack serving must never seed personal memory.

## Shopping comparison

The first shopping feature deliberately compares two user-selected products without relying on category matching.

Primary visible density metrics are:

- protein per 100 kcal;
- fibre per 100 kcal;
- calories per 100 g for context.

Dead bands should remain so trivial numeric differences are described as similar rather than forcing a winner.

## Tie-break rule

When both protein and fibre point to the same product, the comparison can give a clear lean.

When they disagree, do not invent a hidden universal weighting. The sentence should expose the trade-off first.

The current personal app has calorie and protein targets but no explicit fibre target. Therefore it is not correct to claim that the existing target model fully determines a personalised protein-versus-fibre preference.

A protein-oriented lean is allowed only when it is framed explicitly, for example:

> A has more protein per 100 kcal, while B has more fibre. For your current protein target, A is the better fit.

Future versions can make this more contextual by using remaining protein relative to remaining calories, or by adding an explicit user goal/profile. Until then, the app should prefer an honest mixed verdict over an unexplained score.

## Category boundary

Category is intentionally not required for two-scan comparison or the Personal Shelf.

`Find me a better one` remains blocked until category matching is dependable enough and results can be constrained to products the user can realistically buy in the UK. Crowd-sourced Open Food Facts category tags alone are not sufficient evidence for a confident recommendation.

## Local shopping store

`okello_shopping_products_v1` is durable shopping history, not disposable cache. It supports repeated comparison and future Personal Shelf behaviour and is therefore included in complete and encrypted backups.

A future transport/data cache may be introduced separately, but if it does not materially affect recommendations it should be documented as disposable rather than silently added to the backup contract.

## Sequence

1. Two-product comparison.
2. Shared product-data service and retirement of duplicate parsing/request logic.
3. Personal Shelf built on the shared service.
4. Category and UK-availability validation.
5. `Find me a better one` only after step 4 is dependable.
