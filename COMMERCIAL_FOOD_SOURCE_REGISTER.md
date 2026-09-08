# Commercial food-source register

Reviewed: 8 September 2026

Purpose: record candidate nutrition sources only after their commercial-reuse position has been checked. Inclusion here means the source may enter food-level scientific review; it does not mean every value in the source is automatically suitable for Okello Food.

## Cleared candidate sources

| Source | Coverage/use | Reuse position checked | Production role | Notes |
| --- | --- | --- | --- | --- |
| USDA FoodData Central | Generic/global ingredients and foods; Foundation Foods, FNDDS, SR Legacy and branded datasets | USDA states FDC data are public domain and published under CC0 1.0 | Generic/global reference candidate | Prefer downloadable reviewed data in the build process. Runtime API requires an API key and the key must not be exposed in the static PWA. Source: https://fdc.nal.usda.gov/ |
| CoFID 2021 | UK foods and ingredients | GOV.UK content is OGL v3.0 unless otherwise stated; OGL permits commercial reuse with conditions including attribution | UK generic reference candidate | Use only when food identity/preparation is a real match. Source: https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid |
| Nutrient Composition of Popularly Consumed African and Caribbean Foods in the UK (2019) | 33 analysed African/Caribbean composite samples | Article explicitly CC BY 4.0 | Priority culturally distinctive composite-food candidate | UK accredited-laboratory analysis. Preserve tested recipe and do not generalise one recipe into a universal dish value. DOI/source: https://pmc.ncbi.nlm.nih.gov/articles/PMC6835955/ |
| Mineral and phytate contents of some prepared popular Ghanaian foods (2016) | Sodium and mineral evidence for 20 prepared Ghanaian foods | Article explicitly CC BY 4.0 | Supplemental sodium/mineral candidate | Not a complete macronutrient source. Keep dry/wet basis and preparation details straight. DOI: 10.1186/s40064-016-2202-9 |
| Proximate composition and energy density of six popular indigenous Ghanaian snack foods (2026) | Six Ghanaian snacks | Publisher/University of Ghana metadata identifies CC BY 4.0 | Specific Ghanaian snack candidate | AOAC-based proximate analysis with three market locations per snack and duplicate laboratory analyses. DOI: 10.1016/j.jfca.2026.109274 |
| Evaluation of selected minerals and health risk and proximate analysis of wasawasa (2024) | Wasawasa samples from Kumasi | Article explicitly CC BY 4.0 | Specific-dish supplemental candidate | Useful only for the sampled/preparation context; do not extrapolate to unrelated versions. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC11550610/ |

## Blocked / permission required

| Source | Status | Rule |
| --- | --- | --- |
| FAO/INFOODS WAFCT 2019 | Published FAO material uses CC BY-NC-SA 3.0 IGO; commercial use is not cleared by that licence | Comparison/mapping only until written commercial permission or another suitable licence is obtained |

## Sources that require food-level review even when the licence is open

An open licence is necessary, not sufficient. Before a value enters the production catalogue, record:

- exact food/source identifier;
- edible/raw/cooked basis;
- recipe or preparation description;
- analytical versus calculated/imputed basis where available;
- nutrients actually measured or supplied;
- source edition/release/date;
- licence and attribution text;
- reviewer and review date;
- confidence and known limitations.

## Global source rule

Okello Food does not need one national database for every country before people from that country can use the product. Generic ingredients can come from commercially reusable reference datasets; exact branded products can come from their labels; variable composite dishes can be created from the user's own recipe; culturally distinctive catalogue foods require licensed evidence appropriate to the actual dish.

That architecture is what allows global usefulness without pretending every cuisine has already been fully validated.
