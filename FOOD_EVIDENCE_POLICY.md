# Food composition evidence policy

Version 1 · 8 September 2026

## Principle

A nutrition number is not made trustworthy by being precise. Every managed food should eventually answer: where did this value come from, what food/recipe did the source actually describe, what basis was used, how uncertain is the match, and when was it reviewed?

## Evidence fields

Managed foods support these evidence fields in schema v2:

- `sourceName`
- `sourceFoodCode`
- `sourceYear`
- `sourceType`
- `basis`
- `recipeVariant`
- `confidence`
- `reviewedAt`

Missing source information remains `null`; it is not replaced with an invented citation.

## Evidence hierarchy

1. **User's own weighed recipe + finished cooked weight** for a home-cooked mixed dish.
2. **Physical packet label entered/verified by the user** for a branded packaged food.
3. **Open Food Facts record** for the exact packaged product, with missing fields kept missing and the packet label preferred where they conflict.
4. **Appropriately licensed food-composition reference** that closely matches the ingredient/preparation.
5. **Documented generic recipe estimate**, clearly labelled low-confidence and recipe-dependent.

For amount conversion, the separate hierarchy is personal calibrated unit weight, packet-labelled unit weight, generic reference unit, then unresolved/ask the user.

## WAFCT 2019

FAO/INFOODS Food Composition Table for Western Africa (2019) is a high-quality candidate scientific reference for West African foods. Its published user guide states that the work is available under CC BY-NC-SA 3.0 IGO and directs requests for commercial use to FAO licensing.

**Therefore Okello Food must not silently bulk-copy WAFCT 2019 values into a commercial product database.** Before using it as a commercial source of record, the project must obtain/confirm appropriate commercial reuse rights or use another legally suitable source. Until then, WAFCT may be used for scientific comparison/review and source mapping, not as an unexamined bulk import.

## Open Food Facts

Open Food Facts is used for user-triggered packaged-product lookup. Database, contents and image licences are recorded in `third-party-notices.html`. A saved record should keep its source code/barcode, lookup timestamp, serving semantics and missingness.

## Variable dishes

Jollof, shito, soups, stews, waakye accompaniments and similar mixed dishes can vary substantially by recipe, oil, meat and water yield. A generic value is a reference estimate, not a universal truth. The user's own recipe calculator is preferred evidence when available.

## Review rule

A food is not `reviewed` merely because its value resembles another table. Review requires:

- identity/preparation match;
- source and licence check;
- nutrient basis check (per 100 g edible portion, raw/cooked, drained where relevant);
- plausibility check against at least one independent reference where practical;
- reviewer/date recorded;
- no silent filling of missing nutrients.

## Priority review queue

The first formal review should cover the foods users actually log most. Until enough beta data exists, start with high-use Ghanaian staples, proteins, oils, soups/stews, eggs, bread, dairy, canned fish, rice, beans, plantain and common vegetables rather than attempting all catalogue records at once.
