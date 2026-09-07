# Product data architecture

Okello Food uses barcode product data for two different jobs: filling the packaged-food form and helping with shopping decisions. These consumers share one product-data boundary before recommendation features are expanded.

## Core rule

Open Food Facts values are external observations, not defaults. Missing values stay missing.

The product-data service must return `null` for an absent or unusable nutrient value. It must never turn an absent protein, fibre, calorie, sugar, saturated-fat, fat or salt value into zero.

A product assessment may say that the available data is incomplete. It must not manufacture a poor score from missing data.

## Implementation status — v40

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

Both production barcode consumers use this service:

- `shopping-v1.js` uses it for shopping assessment and durable shopping history;
- the packaged-food form in `app.js` uses it to populate the editable label fields.

The old direct Open Food Facts request and lossy barcode nutrient parsing in `app.js` were retired in v38. The form no longer turns absent protein or fibre into zero. Missing values leave their form fields blank and the status tells the user which data is missing. Real numeric zero remains visible as zero.

When the form and shopping layer ask for the same barcode during one lookup, both calls go through `OkelloProductData.get()`. The service's in-flight map therefore gives both consumers the same promise and one network request.

The Personal Shelf landed in v39. It is a view over the existing durable shopping-product store rather than a second product database. It can search products already scanned and put saved products back into the two-product comparison without requiring a fresh network request.

v40 adds the first category-rule layer. It is deliberately conservative: category-specific context is used only for an exact allow-listed source category tag. Similar names, child-looking names and neighbouring categories do not inherit a rule by substring or fuzzy matching.

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

The Personal Shelf must preserve that distinction visibly: a missing serving is shown as `No pack serving supplied`, never as a 100 g pack serving. A future scan-to-log sheet must do the same.

## Shopping comparison

The first shopping feature deliberately compares two user-selected products without relying on category matching.

Primary visible density metrics are:

- protein per 100 kcal;
- fibre per 100 kcal;
- calories per 100 g for context.

Dead bands should remain so trivial numeric differences are described as similar rather than forcing a winner.

Saved Personal Shelf products may be selected into this comparison offline. Comparison does not promote raw Open Food Facts category evidence to a trusted category.

## Tie-break rule

When both protein and fibre point to the same product, the comparison can give a clear lean.

When they disagree, do not invent a hidden universal weighting. The sentence should expose the trade-off first.

The current personal app has calorie and protein targets but no explicit fibre target. Therefore it is not correct to claim that the existing target model fully determines a personalised protein-versus-fibre preference.

A protein-oriented lean is allowed only when it is framed explicitly, for example:

> A has more protein per 100 kcal, while B has more fibre. For your current protein target, A is the better fit.

Future versions can make this more contextual by using remaining protein relative to remaining calories, or by adding an explicit user goal/profile. Until then, the app should prefer an honest mixed verdict over an unexplained score.

## Personal Shelf storage contract

`okello_shopping_products_v1` is the durable source for the Personal Shelf. The shelf must not create a second flattened product store.

Each saved record is the normalised product-data shape plus shelf metadata such as `lastScannedAt`. Storage rules are:

- nutrient values are stored as numbers or `null`, never preformatted display strings;
- a missing nutrient remains `null` through save, backup, restore and shelf rendering;
- a genuine numeric zero remains zero;
- `completeness` and `sourceCategories` are preserved with the record;
- category evidence remains evidence only and is not upgraded into a trusted category;
- reading a shelf product through `OkelloShopping.getProduct()` or `recent()` returns a frozen record, including frozen nested `completeness` and `sourceCategories` data, so downstream UI cannot quietly patch missing values;
- shelf display formatting is derived at render time and is never written back into the canonical product record.

The shelf was originally capped at 60 recently scanned products. v40 raises that cap to 200 because the store is now durable recommendation history rather than a short transport cache.

Okello does **not** automatically pin a product merely because it was scanned several times. Repeated scanning proves repeated encounters, not preference or purchase intent. If retention pressure becomes real, an explicit `Keep on shelf` / pin action is preferable to silently inferring preference from scan frequency.

The store is already included in complete and encrypted backups. Personal Shelf adds no new durable storage key.

## Category rules are data, not code

`category-rules-v1.js` is the v40 category boundary. The rule table is frozen and inspectable. Runtime assessment reads the table rather than scattering category thresholds through shopping UI code.

The first supported exact source tags are deliberately narrow:

- `en:yogurts` → yoghurt;
- `en:breads` → bread;
- `en:peanut-butters` → peanut butter;
- `en:olive-oils` → olive oil.

No substring matching, singular/plural guessing, parent inference or nearest-category fallback is allowed. For example, `en:yogurt-drinks` does not inherit the yoghurt rule merely because the string looks related.

Each rule declares:

- exact accepted source tags;
- required product fields;
- the metrics that matter for that category;
- the interpretation type for each metric;
- explanatory caveats that do not act as penalties.

### Explicit assessment states

The category layer returns one of three states:

1. **Supported** — an exact allow-listed source tag matched and every required input is present/valid.
2. **Incomplete** — an exact supported category matched, but a required source or derived value is missing/invalid. Category-specific observations are withheld and generic nutrient facts remain available.
3. **Unsupported** — no exact supported tag matched. Only generic factual density is shown. The product cannot borrow a neighbouring category's thresholds.

`category-rules-v1.test.js` and `category-rules-v1.test.html` make this boundary executable. The tests include a deliberately similar but unsupported tag and assert that it does not receive the yoghurt rule.

## Reference thresholds used in v40

The category layer does not invent red/amber/green cutoffs.

Where it describes protein or fibre density, it uses existing GB nutrition-claim references as transparent factual benchmarks:

- source of protein: at least 12% of the food's energy from protein;
- high protein: at least 20% of energy from protein;
- source of fibre: at least 1.5 g fibre per 100 kcal (or 3 g per 100 g under the regulation);
- high fibre: at least 3 g fibre per 100 kcal (or 6 g per 100 g under the regulation).

For the app's protein-per-100-kcal display, the 12% and 20% energy conditions correspond to 3 g and 5 g protein per 100 kcal using the standard 4 kcal per gram protein energy factor.

These are reference statements, not Okello personal-fit colours and not the UK front-of-pack traffic-light scheme. Sugar, salt and saturated fat are shown as packet quantities or transparent proportions until their own validated component exists.

Source basis: GB government guidance on retained Regulation (EC) No 1924/2006 and its conditions for permitted nutrition claims; the retained regulation's Annex supplies the fibre and protein conditions.

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

## Category boundary

Category is intentionally not required for two-scan comparison or the Personal Shelf.

`Find me a better one` remains blocked until category matching is dependable enough and results can be constrained to products the user can realistically buy in the UK. Crowd-sourced Open Food Facts category tags alone are not sufficient evidence for a confident wider recommendation.

The v40 exact-tag allow-list is sufficient for limited category context on a scanned item. It is **not** treated as evidence that category discovery is broad enough for stage-seven catalogue search.

## Better-choice claims

A comparative sentence such as `there is a better choice` is allowed only when a specific alternative is actually known and named.

If no better alternative is available, the verdict should stay descriptive, for example:

> Good protein, but high in saturated fat for this category.

Do not imply an actionable alternative exists when the app cannot show one.

## Personal Shelf is the primary recommendation surface

Shelf-based suggestions are not a temporary substitute for wider search. They are the strongest first recommendation source because the user has already encountered those products and may already know they are obtainable, acceptable in price and suitable in taste.

The first `better choice` implementation should therefore compare a newly scanned product against relevant products in the user's own shelf before any wider catalogue search is attempted.

A wider UK-availability-aware search is an extension of this feature, not a replacement for the Personal Shelf recommendation path.

The v39/v40 shelf itself does not yet issue `better choice` recommendations. It stores and exposes the evidence safely and lets the user make explicit saved-product comparisons.

## Local shopping store

`okello_shopping_products_v1` is durable shopping history, not disposable cache. It supports repeated comparison and Personal Shelf behaviour and is therefore included in complete and encrypted backups.

A future transport/data cache may be introduced separately, but if it does not materially affect recommendations it should be documented as disposable rather than silently added to the backup contract.

## Sequence

1. Two-product comparison. **Implemented.**
2. Shared product-data service and retirement of duplicate parsing/request logic. **Complete in v38.**
   - 2a. Shared service + executable contract tests. **Implemented in v37.**
   - 2b. Packaged-food form moved onto the service; direct request and lossy barcode parser retired. **Implemented in v38.**
3. Personal Shelf built on the shared service and durable normalised product store. **Implemented in v39.**
4. Small data-driven category rule table with exact-match category evidence plus explicit unsupported and incomplete states. **Implemented in v40.**
5. Exact UK front-of-pack traffic-light component, if implemented, using the official scheme rather than custom thresholds. **Next.**
6. Shelf-based `better choice` suggestions where a specific alternative is known.
7. Category and UK-availability validation for wider product search.
8. Wider `Find me a better one` only after step 7 is dependable.
