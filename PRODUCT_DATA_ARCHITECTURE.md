# Product data architecture

Okello Food uses barcode product data for two different jobs: filling the packaged-food form and helping with shopping decisions. These consumers share one product-data boundary before the Personal Shelf is expanded.

## Core rule

Open Food Facts values are external observations, not defaults. Missing values stay missing.

The product-data service must return `null` for an absent or unusable nutrient value. It must never turn an absent protein, fibre, calorie, sugar, saturated-fat, fat or salt value into zero.

A product assessment may say that the available data is incomplete. It must not manufacture a poor score from missing data.

## Implementation status — v38

`product-data-v1.js` is the shared normalisation and retrieval service for barcode product data.

It currently:

- accepts a barcode and performs the Open Food Facts product request;
- deduplicates concurrent requests for the same barcode;
- returns the exact same in-flight `Promise` to concurrent callers for that barcode;
- resolves those callers to the same frozen normalised product object;
- preserves missing nutrient values as `null`;
- preserves real numeric zeroes, including values supplied as the string `"0"`;
- calculates density ratios only when their inputs are present and calories are positive;
- keeps pack serving separate from product nutrient values;
- carries source, checked-at, completeness and raw category evidence without promoting the crowd-sourced category to a trusted Okello category.

Both production barcode consumers now use this service:

- `shopping-v1.js` uses it for shopping assessment and durable shopping history;
- the packaged-food form in `app.js` uses it to populate the editable label fields.

The old direct Open Food Facts request and lossy barcode nutrient parsing in `app.js` were retired in v38. The form no longer turns absent protein or fibre into zero. Missing values leave their form fields blank and the status tells the user which data is missing. Real numeric zero remains visible as zero.

When the form and shopping layer ask for the same barcode during one lookup, both calls go through `OkelloProductData.get()`. The service's in-flight map therefore gives both consumers the same promise and one network request.

Step 2 of the shopping sequence is complete. The Personal Shelf is no longer blocked on duplicate product retrieval/parsing.

## Executable missingness contract

The missingness and request-deduplication rules are executable tests, not just prose.

`product-data-v1.test.js` covers at least:

- protein field absent → `null`;
- protein field empty string → `null`;
- protein field `"0"` → numeric `0`, with completeness `true`;
- calories `"0"` → numeric `0`, but protein/fibre-per-100-kcal ratios remain `null` because division by zero is invalid;
- serving quantity `"0"` → no valid pack serving (`null`);
- positive serving quantity → preserved;
- zero sugar, saturated fat and salt → preserved as real zeroes;
- two concurrent `get()` calls for the same barcode return the exact same `Promise`;
- both callers resolve to the identical product object;
- the shared request is made once;
- the normalised product object is frozen.

`product-data-v1.test.html` is the browser runner for that contract. A regression should fail loudly rather than silently changing missing values into zeroes.

## Shared service contract

`product-data-v1.js` is the runtime owner of Open Food Facts retrieval and normalisation.

It must:

- accept a barcode and perform one product request;
- deduplicate concurrent requests for the same barcode;
- return the same in-flight promise, not caller-specific wrapper promises;
- normalise the response into one stable product shape;
- preserve missingness explicitly;
- expose source and checked-at metadata;
- calculate derived ratios only when their inputs are present and valid;
- return pack serving data separately from personal portions;
- avoid assigning a trusted product category unless the category source is dependable enough for the consumer using it.

Production consumers must use this service rather than adding another direct Open Food Facts parser or request path.

## Normalised product shape

The shared shape supports at least:

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
- `fat100`
- `salt100`
- `proteinPer100Kcal`
- `fibrePer100Kcal`
- `source`
- `sourceCheckedAt`
- `completeness`
- `sourceCategories` as raw source evidence, not a trusted Okello category

Derived values such as protein per 100 kcal are `null` whenever calories or the relevant nutrient are missing, or when calories are not positive.

## Amount meanings must stay separate

A scanned product can expose three different amounts and they must never be conflated:

1. **Pack serving** — manufacturer / product-database figure. Use Open Food Facts `serving_quantity` when valid; otherwise no pack serving is known.
2. **Smart Portion** — amount suggested from the user's current calorie and meal context.
3. **Your usual** — amount learned from the user's own logs after the normal Personal Food Memory threshold is met.

For a new product, `Your usual` is blank. A pack serving must never seed personal memory.

The packaged-food form may display 100 g as a neutral editable amount when no pack serving is known. That is a UI fallback only; the shared product object must continue to report `servingG: null`.

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

## Two separate colour systems

Traffic-light nutrition and personal-fit verdicts answer different questions and must remain visually and semantically separate.

### UK front-of-pack traffic lights

If Okello Food displays green / amber / red nutrient traffic lights for fat, saturated fat, sugar or salt, it must implement the official UK front-of-pack scheme exactly rather than borrowing the colours with custom thresholds.

Implementation must:

- source the current thresholds from official UK guidance at the time of implementation;
- preserve the scheme's per-100-g / per-100-ml and portion rules exactly;
- label the component clearly as the UK front-of-pack traffic-light scheme;
- never substitute Okello-specific thresholds behind the same colours.

If Okello uses different thresholds or a different nutrition interpretation, it must use a different visual language so a shopper cannot mistake an Okello judgement for the public labelling standard.

### Personal fit

The personal-fit verdict is not a nutrient traffic light and must not reuse the same meaning.

It answers whether the product fits the user's current goal, using inspectable metrics such as protein density, fibre density, calorie density and, only where justified, category-specific rules. Copy must describe the product, not judge the shopper.

Examples of acceptable language:

- `Good protein for the calories.`
- `High calorie for the protein it provides.`
- `Higher saturated fat for this category.`
- `Easy to overeat; portion size matters.`

Avoid moral or identity language such as `bad food`, `guilty`, `clean`, `cheat`, or wording that implies a judgement about the person holding or eating the product.

## Assessment states

Category-aware assessment has three explicit states:

1. **Category known and supported** — use the matching category rule set, provided required nutrient inputs are present.
2. **Category unknown or unsupported** — show only generic truths that do not depend on category, such as protein per 100 kcal, fibre per 100 kcal and calorie density. Do not silently fall back to a category-specific colour verdict.
3. **Incomplete product data** — show `Cannot fully assess` and identify the missing fields. Missing values must never be treated as zero.

The UI should make the state visible so confidence in the input travels with the verdict.

## Category rules are data, not code

Category-aware fit logic should be represented as a small inspectable rules table rather than scattered conditionals.

Each supported category should declare:

- category id and aliases accepted for that rule;
- which two or three metrics matter;
- thresholds or comparison bands for those metrics;
- required fields;
- explanatory copy fragments;
- any standing caveat that should be shown without acting as a penalty.

Initial scope should be deliberately small. It is better to support a handful of well-defined categories than to pretend every Open Food Facts category is reliable.

Illustrative rule intent:

- yoghurt: protein density and sugar, with other nutrients shown separately;
- bread: fibre density, salt and calorie context;
- oils: fat quality and portion control, not protein density;
- nuts / nut butters: fat quality and portion control, with `easy to overeat` as a caveat rather than a negative score.

These examples are product-design intent, not final thresholds. Thresholds must be validated before runtime use.

## Category boundary

Category is intentionally not required for two-scan comparison or the Personal Shelf.

`Find me a better one` remains blocked until category matching is dependable enough and results can be constrained to products the user can realistically buy in the UK. Crowd-sourced Open Food Facts category tags alone are not sufficient evidence for a confident recommendation.

## Better-choice claims

A comparative sentence such as `there is a better choice` is allowed only when a specific alternative is actually known and named.

If no better alternative is available, the verdict should stay descriptive, for example:

> Good protein, but high in saturated fat for this category.

Do not imply an actionable alternative exists when the app cannot show one.

## Personal Shelf is the primary recommendation surface

Shelf-based suggestions are not a temporary substitute for wider search. They are the strongest first recommendation source because the user has already encountered those products and may already know they are obtainable, acceptable in price and suitable in taste.

The first `better choice` implementation should therefore compare a newly scanned product against relevant products in the user's own shelf before any wider catalogue search is attempted.

A wider UK-availability-aware search is an extension of this feature, not a replacement for the Personal Shelf recommendation path.

## Local shopping store

`okello_shopping_products_v1` is durable shopping history, not disposable cache. It supports repeated comparison and future Personal Shelf behaviour and is therefore included in complete and encrypted backups.

A future transport/data cache may be introduced separately, but if it does not materially affect recommendations it should be documented as disposable rather than silently added to the backup contract.

## Sequence

1. Two-product comparison. **Implemented.**
2. Shared product-data service and retirement of duplicate parsing/request logic. **Complete in v38.**
   - 2a. Shared service + executable contract tests. **Implemented in v37.**
   - 2b. Packaged-food form moved onto the service; direct request and lossy barcode parser retired. **Implemented in v38.**
3. Personal Shelf built on the shared service. **Next.**
4. Small data-driven category rule table with explicit unknown-category and incomplete-data states.
5. Exact UK front-of-pack traffic-light component, if implemented, using the official scheme rather than custom thresholds.
6. Shelf-based `better choice` suggestions where a specific alternative is known.
7. Category and UK-availability validation for wider product search.
8. Wider `Find me a better one` only after step 7 is dependable.
