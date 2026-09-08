# Food composition source-of-record decision

Version 1 · 8 September 2026

## Decision

Okello Food will not use one universal nutrition source. Commercial source-of-record is a licensed evidence hierarchy, chosen by food type and preparation.

### 1. Generic UK foods

Use McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID) where the food identity and preparation match. CoFID is published on GOV.UK under the Open Government Licence v3.0 unless otherwise stated. OGL permits commercial reuse subject to attribution and its other conditions.

### 2. Branded packaged foods

The physical packet label, when entered or verified by the user, is the preferred source for that exact product. Open Food Facts is a convenience lookup layer, not an authority above the packet. OFF source, timestamp, barcode, serving semantics and missingness must be preserved and its database/content/image licences observed.

### 3. Ghanaian and West African foods

Use commercially reusable primary analytical literature where the paper's licence explicitly permits commercial reuse and the tested recipe/preparation is a sufficiently close match. A paper is not eligible merely because it is open access.

Eligible examples already identified for review include:

- Nutrient Composition of Popularly Consumed African and Caribbean Foods in the UK (2019), CC BY 4.0, with accredited-laboratory analysis of dishes including kenkey, shito, cassava/plantain fufu, jollof and groundnut soup.
- Mineral and phytate contents of some prepared popular Ghanaian foods (2016), CC BY 4.0, useful particularly for sodium/mineral evidence for the tested Ghanaian meals.
- Proximate composition and energy density of six popular indigenous Ghanaian snack foods (2026), published open access under CC BY 4.0.

Each extracted value must retain the article citation, licence, tested recipe/preparation, analytical basis and review date. Values from one tested recipe must not be presented as a universal truth for every version of the dish.

### 4. Home-cooked composite dishes

For the individual user's own jollof, soup, stew, curry or other composite dish, the user's weighed recipe plus finished cooked weight is preferred over a generic catalogue estimate. This is personal evidence, not a new general population reference.

### 5. WAFCT 2019

WAFCT 2019 remains a scientific comparison and mapping source only unless FAO grants commercial reuse permission appropriate to the product. Its published licence is CC BY-NC-SA 3.0 IGO and commercial-use requests are directed to FAO licensing. No bulk import or production value may be justified solely from WAFCT without that permission.

### 6. Commissioned analytical data

Commission laboratory analysis only for high-value gaps where commercially reusable literature and CoFID do not adequately cover the food. Before commissioning, the laboratory contract must expressly allow unrestricted commercial use of the results and assignment/licensing of any relevant report/database rights to the project.

One public 2026-27 UK benchmark lists full nutrition analysis at £569.12 per sample, with fibre additional. This is a planning benchmark, not a supplier quote for this project. Replicate samples, recipe preparation, fibre and specialist analyses can materially increase the real cost.

## Licence gate

Scientific suitability is evaluated only after licence suitability. The review order is:

1. food identity/preparation match;
2. licence permits intended commercial use;
3. analytical/method quality;
4. nutrient basis and missingness;
5. plausibility comparison;
6. reviewer and date recorded.

A scientifically excellent source that cannot legally support the intended commercial use is not a production source of record.

## Top-75 rule

Do not start a blind 75-food data replacement exercise. First classify each priority food into one of four lanes:

- CoFID/OGL match;
- packet/OFF product;
- CC BY or otherwise commercially licensed primary literature;
- evidence gap requiring user recipe or commissioned analysis.

Only then review and replace values.
