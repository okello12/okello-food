# v47 release notes: global-first beta readiness

## Release purpose

v47 does not broaden Okello Food by pretending every cuisine has equal validated coverage. It changes discovery and evidence operations so the product can be useful to people from many food backgrounds while preserving the deeper West African work already built.

The release principle is:

> **Broad globally, deep locally.**

Ghanaian and West African food support is a beachhead, not a product boundary.

## Product changes

- Static first paint now says food from around the world rather than framing the product as Ghana-first.
- New-user discovery defaults to **Mixed / from anywhere**.
- Familiar-food starter regions cover West Africa, Caribbean, South Asia, East & Southeast Asia, North Africa & Middle East, UK & Europe, Latin America and mixed/global eating.
- Familiar-food preference changes starter shortcuts only. It never limits search and never becomes a nutrition recommendation.
- Existing profile/storage keys remain unchanged.
- Evidence-review fallback is globally representative while actual logged usage always ranks first.
- A predeclared 90-day multicultural beta protocol defines what evidence would justify continued product investment.

## Data and trust hardening

- Backup staging now distinguishes storage exhaustion from a corrupt/invalid backup.
- If a restore fails and rollback itself cannot restore every previous store, the app explicitly reports possible mixed state rather than claiming the device was fully preserved.
- Both cases have injected-failure regression coverage.

## Food evidence strategy

- Source selection follows the food, not the user's nationality.
- Commercially reusable African analytical literature is the first lane for matching culturally distinctive African/Caribbean composite foods.
- USDA FoodData Central CC0 and CoFID/OGL are reference lanes for appropriate generic foods and ingredients.
- Exact packet labels govern branded products when available.
- A user's weighed recipe and final cooked weight govern their own variable composite dish.
- WAFCT remains comparison/mapping only unless commercial reuse permission is obtained.
- Commissioned analysis is reserved for commercially important evidence gaps after licensed-source triage.

## What v47 does not claim

v47 does not claim:

- equal food-composition depth for every culture;
- nutrition-professional sign-off of the priority catalogue;
- FAO commercial permission for WAFCT;
- completed ICO fee/DPIA/controller analysis;
- real 30–50-user retention evidence;
- that a discovery-region selection reveals or represents a user's ethnicity or identity.

Those remain external evidence/governance work and are tracked in `DUE_DILIGENCE_REGISTER.md`.

## Regression boundary

v47 retains all historical migration, meal, piece, Smart Meal, template, feedback, first-run, v45 compatibility and v46 write-safety regressions. It adds bundle/cache alignment, global-first discovery, globally representative evidence fallback and backup failure-diagnostic tests.
