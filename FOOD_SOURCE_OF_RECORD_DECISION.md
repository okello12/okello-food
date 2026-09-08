# Food composition source-of-record decision

Version 3 · 8 September 2026

## Decision

Okello Food will not use one universal nutrition source. Commercial source-of-record is a licensed evidence hierarchy, chosen by food type and preparation.

The product is globally useful, with deeper current evidence for West African foods. Source selection must follow the food, not the user's country or ethnicity. A source does not rank above another merely because it is a larger national table.

### 1. Culturally distinctive Ghanaian, West African and closely matching African/Caribbean composite foods

Use commercially reusable primary analytical literature where the paper's licence explicitly permits commercial reuse and the tested recipe/preparation is a sufficiently close match. For foods that make Okello Food distinctive, this lane is checked before generic national tables because those tables often do not contain the relevant composite dishes.

Eligible examples already identified for review include:

- **Nutrient Composition of Popularly Consumed African and Caribbean Foods in the UK** (2019), CC BY 4.0, with 33 composite samples analysed in a UK accredited laboratory. It includes foods such as kenkey, shito, cassava/plantain fufu, jollof and groundnut soup.
- **Mineral and phytate contents of some prepared popular Ghanaian foods** (2016), CC BY 4.0, useful particularly for sodium/mineral evidence for 20 tested Ghanaian meals.
- **Proximate composition and energy density of six popular indigenous Ghanaian snack foods** (2026), Journal of Food Composition and Analysis, CC BY 4.0, covering agbelikaklo, daakoa, poolo, bamfo bisi, nkate cake and adunlee.

Each extracted value must retain the article citation, licence, tested recipe/preparation, analytical basis and review date. Values from one tested recipe must not be presented as a universal truth for every version of the dish.

### 2. Generic foods and ingredients used globally

Use a commercially reusable national/reference dataset where identity, preparation and nutrient basis match.

**USDA FoodData Central** is a strong global generic source because USDA states that FoodData Central data are public domain and published under CC0 1.0. It contains Foundation Foods, FNDDS, SR Legacy and branded data. For Okello Food's static/local-first architecture, prefer reviewed data extracted from downloadable releases during the build/review process rather than a runtime API dependency. The FoodData Central API requires an API key, which must not be embedded in a public static PWA.

**CoFID 2021** remains the preferred UK reference lane for matching UK foods and ingredients. CoFID is published on GOV.UK; GOV.UK content is available under the Open Government Licence v3.0 unless otherwise stated. OGL permits commercial reuse subject to attribution and its other conditions.

When both FDC and CoFID contain a plausible match, prefer the source whose food description, preparation and market context most closely match the food being logged. Preserve the source code/identifier so the choice is auditable.

### 3. Branded packaged foods

The physical packet label, when entered or verified by the user, is the preferred source for that exact product. Open Food Facts is a convenience lookup layer, not an authority above the packet. OFF source, timestamp, barcode, serving semantics and missingness must be preserved and its database/content/image licences observed.

For a branded product, an exact current packet label can outrank generic literature, CoFID or FDC because it describes the product actually consumed.

### 4. Home-cooked composite dishes

For the individual user's own jollof, soup, stew, curry or other composite dish, the user's weighed recipe plus finished cooked weight is preferred over a generic catalogue estimate. This is personal evidence, not a new general population reference.

### 5. WAFCT 2019

WAFCT 2019 remains a scientific comparison and mapping source only unless FAO grants commercial reuse permission appropriate to the product. Its published licence is CC BY-NC-SA 3.0 IGO and commercial-use requests are directed to FAO licensing. No bulk import or production value may be justified solely from WAFCT without that permission.

### 6. Commissioned analytical data

Commission laboratory analysis only for high-value gaps where commercially reusable literature and open reference datasets do not adequately cover the food. Before commissioning, the laboratory contract must expressly allow unrestricted commercial use of the results and assignment/licensing of any relevant report/database rights to the project.

One public 2026-27 UK benchmark lists full nutrition analysis at £569.12 per sample, with fibre additional. This is a planning benchmark, not a supplier quote for this project. Replicate samples, recipe preparation, fibre and specialist analyses can materially increase the real cost.

Paying for analysis does not by itself establish ownership of the resulting dataset. The contract must settle commercial reuse and relevant data/report rights before work starts.

## Licence gate

Licence suitability is checked before scientific extraction work begins. A source is not placed into the production extraction queue merely because it is authoritative or repeatedly recommended.

The review order is:

1. licence permits intended commercial use;
2. food identity/preparation match;
3. analytical/method quality;
4. nutrient basis and missingness;
5. plausibility comparison;
6. reviewer and date recorded.

A scientifically excellent source that cannot legally support the intended commercial use is not a production source of record.

This rule was introduced after two independent reviews recommended WAFCT 2019 without first verifying the non-commercial licence term. The repeated recommendation did not make the source commercially usable; it exposed a process failure that is now a standing gate.

## Priority-food classification rule

Do not start a blind 75-food data replacement exercise. Classify each priority food by its actual type before review:

1. **Culturally distinctive African/Caribbean composite** → check commercially reusable analytical literature first.
2. **Generic food or ingredient** → check FDC CC0 and, for UK context, CoFID/OGL; choose the closest identity/preparation match.
3. **Exact branded packaged product** → packet label first, OFF as convenience/source evidence.
4. **Home-cooked variable composite** → user's own recipe/final cooked weight preferred for personal use.
5. **No adequate licensed source** → evidence gap; consider additional literature mapping, FAO permission or commissioned analysis.

Only then review and replace values. The queue should be driven by actual beta usage and commercial relevance, not by catalogue order or a country quota.
