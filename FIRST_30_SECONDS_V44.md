# v44 First 30 Seconds

## Goal
A new user on a small phone should be able to open the app and begin logging a culturally familiar meal in under 30 seconds without understanding the product architecture.

## Beta evidence addressed
The v43 feedback converged on the same first-run problems: White rice felt like the default mascot, the mobile search prompt truncated, the fixed bottom navigation covered content, Clear today looked too prominent, the app exposed too many tools at once, starter calorie/protein targets appeared unexplained, empty activity looked like fake measurement, household users did not want to weigh every meal, the whole-pot heading sounded like financial costing, and Android install guidance was absent.

## v44 decisions

### One primary home question
The global food search is framed as **What did you eat?**. Search is primary and Scan remains secondary. Builder-oriented shortcut chips are hidden on the mobile home surface.

### Progressive navigation
Mobile keeps Today, Foods and History visible. Recipes, Activity and Settings move behind a single More control. Existing panels and their internal contracts are unchanged.

### First-run setup
Only two declared preferences are collected:
1. foods that feel like home;
2. current food focus.

No conditions, diagnoses or medical-history fields are introduced. Starter targets are disclosed as defaults, not personalised values, and can optionally be changed in the same sheet.

Existing users are not forced back through onboarding.

### Familiar starter foods
A fresh Ghana/West Africa profile surfaces Waakye, Banku, Kenkey, Jollof, Light soup, Fried plantain and Egg as one-tap starters where those foods resolve in the canonical catalogue. Other culture selections receive their own starter set.

### No silent White-rice choice
For a genuinely fresh user, the detailed Quick Add controls remain hidden until a food has been actively selected through search, a starter chip, the library or the food selector. Smart Portion therefore does not lead with an unexplained default food.

### Rough serving without corrupting evidence
For non-piece-native foods, Small / Usual / Large may be used instead of a scale. These values are derived from the food's existing min / portion / max contract and are persisted as `amountQuality: estimated` through `OkelloPieceEntry.estimatedGramAmount` and `createLogDraft`, with `estimateSource: rough-serving-v44`.

Piece-native foods continue through the existing piece review workflow. v44 does not flatten piece observations into generic grams.

This is the first no-scale layer, not the final household-unit ontology. Balls, ladles, scoops, wraps and takeaway containers need explicit food-specific serving contracts rather than guessed conversions.

### Point-of-use trust
Today-log entries can show Weighed, Estimated from pieces, Estimated serving, or Estimated where the source data supports that label. The bottom disclaimer remains, but estimates no longer rely only on a lecture at the end of the page.

### Empty activity
The Today activity strip is hidden until actual activity evidence exists. The Activity panel remains available under More for users who choose to use it.

### Whole-pot wording
`Cost the whole pot once` becomes `Calculate the whole pot once`. Financial recipe costing is not claimed until ingredient-price and cost-per-serving functionality exists.

### Mobile and install fixes
The bottom safe area is increased, search copy is shortened, Clear today becomes the quieter Clear log action, Today removes the redundant Back/Refresh chrome, and install guidance covers both iPhone/Safari and Android/Chrome.

## Deliberate non-goals
- No photo-recognition API or server cost.
- No cloud account or cloud sync.
- No health-condition collection.
- No fabricated demo diary entries. The example meal is explicitly marked as an example and never enters history.
- No carbs/fat/sodium expansion until those nutrients are added through an audited catalogue/data-contract change.
- No renaming of `okello_*` storage keys, `Okello*` APIs, or the repository.
- No app rename in v44.

## Evidence principle
Declared preference is a hint. Repeated observed behaviour is stronger evidence. Machine-derived estimates remain estimates and do not become independent observations simply because the app displayed them.
