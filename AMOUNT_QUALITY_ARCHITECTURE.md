# Okello Food amount-quality architecture

## Question answered

Food-source confidence and amount confidence are separate questions.

A nutrition value may come from a highly trusted barcode or weighed recipe while the amount eaten was still guessed by eye. Conversely, a precisely weighed amount can use an estimated mixed-dish nutrition value.

Each new log can therefore carry `amountQuality` with one of two explicit values:

- `weighed` — the amount was measured on a scale;
- `estimated` — the amount was judged by eye, suggested by the app, repeated from a template, or otherwise not freshly weighed.

Older entries are deliberately left without this field and are displayed as unclassified. The app does not rewrite historical data by assumption.

## General evidence-learning rule

Learning follows the evidence the person actually supplied, not values the estimator manufactured from that evidence.

**What the person directly observed is learnable. What the estimator derived from it is not independently learnable.**

Examples:

- `4 medium pieces` is a direct observation. The app may learn that the person's usual amount is 4 medium pieces.
- `224 g` produced by multiplying those 4 pieces by a 56 g piece model is a derived estimate. It must not train usual-gram memory as though the person weighed 224 g.
- a genuinely weighed `224 g` is a direct observation and may train usual-gram memory.

This is a general provenance rule, not a special exception for pieces. Future input methods must preserve the same distinction between what the person directly supplied and what the application inferred or converted from it.

## Capture

Quick Add asks the user whether the amount was weighed or estimated. Estimated is the conservative default.

Smart Meal Composer, natural-language logging, Plate Builder, restaurant estimates, repeated meals and templates arm new entries as estimated because their gram amounts are generated or reused rather than freshly measured.

The runtime tagging layer watches only new log IDs created immediately after a logging action. It does not alter imports or unrelated state writes.

Users can correct the classification of an existing Today entry from the amount-quality selector shown beside the log.

## Piece estimates

For piece-native foods, the person-facing amount and the nutrition-engine amount are deliberately different representations of the same estimate.

The person may enter `4 medium pieces`; the estimator resolves that to grams using the current piece model. A piece entry therefore keeps the entered count and `pieceKey`, plus a frozen `estimatedGrams` value for the converted amount.

`estimatedGrams` is authoritative for piece entries. The existing `grams` field remains for compatibility with totals and history surfaces, but every new piece-entry write must normalise `grams` to the same value. Nutrition is calculated from that frozen actionable gram estimate.

Calibration evidence is scoped to the exact `foodId` and `pieceKey`. Three medium-piece observations may promote a medium personal reference; a large-piece observation cannot contribute to that threshold.

### Piece count is direct evidence even when grams are estimated

A piece entry has two different evidence layers:

- `pieceCount` and `pieceKey` record what the person directly counted/selected;
- `estimatedGrams` records the estimator's current conversion of that discrete amount into nutrition-engine grams.

Therefore `amountQuality: "estimated"` on a piece entry describes the gram conversion. It does **not** mean the directly entered count should be discarded.

Gram-based Personal Food Memory remains strict: estimated gram amounts do not train a learned usual gram portion. Piece-based Personal Food Memory may separately learn a usual discrete amount from repeated direct piece entries. For example, three or more logs of `4 medium pieces` may establish `4 medium pieces` as the usual piece amount even though the resolved gram values remain estimated.

Piece-size evidence never crosses keys. Medium-piece logs train a medium-piece usual; large-piece logs do not count toward the medium threshold.

If the user switches from pieces to grams before confirming, the active amount becomes a plain gram entry. The current converted gram value may prefill the field, but persisted piece provenance is cleared. Unless the user explicitly marks the gram amount as weighed, the resulting entry is a plain estimated gram amount and does not train piece-count memory.

## Smart Portion and discrete units

Smart Portion calculates a continuous calorie-compatible target in grams first. For foods that are normally eaten in pieces, the estimator may project that target into an actionable piece amount.

The discrete-unit rule is explicit:

**When a piece count cannot exactly match a continuous target, the default estimator understates rather than overstates.**

The suggested piece count is therefore the greatest whole count whose resolved grams do not exceed the continuous target. For example, if the current medium-goat estimate is 56 g and the engine target is 187 g, Smart Portion suggests 3 medium pieces, about 168 g, rather than 4 pieces at 224 g.

If the continuous target is smaller than one available piece, the result remains a gram suggestion rather than rounding to zero pieces.

The Smart Portion result preserves both values:

- `targetGrams` is the continuous allowance calculated by the calorie engine;
- `grams` is the actionable amount after piece conversion;
- `pieceSuggestion` carries the count, `pieceKey`, resolved grams and estimate provenance when a piece rendering is available.

`targetGrams` is context for the user and must never become the nutrition basis for a logged piece suggestion. Calories, protein and fibre for the log are calculated from the actionable `grams` / `estimatedGrams` value after conversion.

The UI should keep the continuous target available when it differs from the actionable piece suggestion so a user can see the allowance that remains unused. It must not silently present the rounded-down piece count as though it were the exact continuous target.

## Weekly data quality

The seven-day quality metric is calorie weighted, not merely entry counted.

For example, if 38% of logged calories came from entries whose amount was estimated, the app reports 38% estimated. This better reflects how much uncertainty can affect the weekly calorie average.

The Weekly Intelligence view and Settings show weighed, estimated and unclassified shares separately.

## Personal Food Memory

The existing gram-usual model and the new piece-usual model answer different questions and must not be collapsed into one number.

For grams, explicitly estimated amounts do not train the learned usual portion. To preserve continuity for existing users, older unclassified logs can temporarily support the learned gram portion. Once at least three weighed observations exist for a food, weighed observations become the sole basis for its learned gram portion.

For piece-native foods, direct `pieceCount` + `pieceKey` observations may train a separate usual piece amount because the person directly supplied those discrete values even though the gram conversion is estimated. The current v41 rule requires at least three observations of the same `pieceKey` before that piece size can produce a usual amount. Meal-specific piece memory wins when it has enough evidence; otherwise the app may fall back to the overall usual piece amount.

Food frequency, recency, favourites and preferred meal can still use all logs because those signals do not depend on the accuracy of the gram amount.

Satiety feedback also remains independent of amount-quality classification.

## Storage and backup

`amountQuality` lives inside each log entry in `okello_food_tracker_v3`. It creates no new local-storage key, so it is already included in both plain and encrypted complete backups.

Piece provenance, including entered count, `pieceKey`, frozen `estimatedGrams`, estimate source and calibration basis, belongs to the log snapshot for the same reason: later changes to reference or personal piece weights must not resize historical meals.

Piece-usual memory is derived from those durable log snapshots. It does not create a second authoritative store.

## Guardrail

Amount quality describes the evidence behind the gram amount. It must not be confused with the food-source trust tier.

An estimated gram amount must not silently become a learned usual gram portion simply because it was logged repeatedly. Conversely, a directly entered piece count must not be thrown away merely because its gram conversion is estimated. The application should preserve those two evidence layers rather than forcing them into one confidence flag.
