# Shopping architecture

Okello Food treats shopping as a decision-support problem, separate from food logging.

## Product sequence

The implementation order is deliberate:

1. **Compare two scans** — no category inference required.
2. **Personal shelf** — compare a new scan with products the user has scanned or bought before.
3. **Find me a better one** — only after category matching and UK availability are reliable enough to avoid unusable recommendations.

The current runtime implements stage 1 and the durable product cache needed for later stages. It does not yet claim category-aware recommendations or UK stock availability.

## Current comparison metrics

The first comparison uses inspectable nutrient-density facts:

- calories per 100 g;
- protein per 100 kcal;
- fibre per 100 kcal;
- manufacturer / database serving quantity when supplied.

Protein per 100 kcal is calculated as:

`protein_100g / kcal_100g * 100`

Fibre per 100 kcal uses the same method.

The app does not collapse these into a hidden universal health score. The comparison sentence says which product provides more protein or fibre per 100 kcal, or says the products are similar within a small display threshold.

## Missing data is not zero

Open Food Facts is crowd-sourced and fields can be absent.

`shopping-v1.js` preserves missing calories, protein and fibre as `null`. A missing field produces an incomplete comparison message. It must never be converted to zero merely because arithmetic would otherwise be inconvenient.

This rule is part of the recommendation contract: confidence in the source data travels with the verdict.

## Category boundary

Stage 1 intentionally does not use Open Food Facts category tags. Category quality is not reliable enough to be a prerequisite for comparing two products the user is already holding.

Future category-aware recommendations must keep category confidence visible and must not silently infer a precise product class from a weak or inconsistent tag.

## Local product store

`okello_shopping_products_v1` stores up to 60 recently scanned products, keyed by barcode. Each product records the source values used for comparison, source-check time and last scan time.

A repeat scan shows the saved product immediately and then refreshes it from Open Food Facts when online. If the network is unavailable, the saved scan remains usable.

Although this behaves like a cache, it is classified as **durable recommendation input**, because prior scans can affect later shopping decisions. It is therefore included in the complete backup bundle. See `BACKUP_ARCHITECTURE.md`.

## Separation from logging

A shopping comparison answers: **Which of these products better fits the metric I care about?**

Logging answers: **What amount did I eat and what does that do to today's totals?**

A scanned product may later flow into tap-to-log, but shopping assessment must not silently add anything to Today.

For a newly scanned product, a manufacturer serving quantity is a packet fact, not a learned personal usual amount. Personal Food Memory remains blank until its normal learning threshold is reached.

## Future stages

The personal shelf should be built from this same durable store rather than a second product-history store.

“Find me a better one” must come last. It requires defensible category matching and a UK availability constraint. Recommending an unavailable product is considered a product failure, not a harmless suggestion.
