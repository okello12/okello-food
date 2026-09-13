# Current → Future Architecture Map

Version 2 · 13 September 2026  
Repository snapshot reviewed: `main` at `9cd028dd12014e5c7af7b5284b83ee6eb6cdf994`

## Why this document exists

Okello Food / the future Bowlful product must evolve from the system that already exists. It must not create a second architecture beside the current local-first application, duplicate food data, or accidentally turn compatibility code into future product design.

This map classifies the current runtime and repository boundaries into:

- **KEEP** — preserve the contract unless evidence requires change.
- **EVOLVE** — keep the responsibility but improve the implementation.
- **KNOWLEDGE PLANE** — shared food/evidence data; no personal diary access required.
- **PERSONAL PLANE** — device-local user data and behaviour.
- **GOVERNANCE** — safety, evidence, privacy, beta and audit controls.
- **TECHNICAL DEBT** — compatibility or superseded implementation to retire deliberately.
- **FUTURE ONLY** — do not build until a named evidence gate is passed.
- **BLOCKED BEFORE GATE** — do not implement without the relevant regulatory/economic decision.

The architecture is an extension of the current application, not a rewrite.

---

# 1. The architectural invariant

> **Nobody needs access to a person's diary to improve the food knowledge base.**

That gives the product three deliberately separate planes.

```text
                         SHARED KNOWLEDGE PLANE
        foods · recipes-as-reference · portions · nutrients · evidence
         sources · confidence · licences · reviews · catalogue versions
                                  │
                                  │ published catalogue
                                  ▼
                           CONSUMER APPLICATION
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
          PERSONAL PLANE                    FUTURE COLLABORATION
        local diary/history                 explicit sharing only
        personal recipes                    professional advice objects
        personal portions                   identity/permissions/audit
        favourites/activity                 no silent diary mutation
        backups/migrations                           │
                                                    ▼
                                           REGULATORY DECISION GATE
```

The **knowledge plane can grow independently of personal data**. Reviewer recruitment, food-data correction and evidence/versioning must therefore default to zero access to consumer records.

---

# 2. Current product boundary that must remain authoritative

The current intended purpose is adult food literacy and general wellbeing. It supports meal recording, culturally familiar portions, home-cooked recipe calculation, source-backed food information and approximate nutrient totals.

Without a separate regulatory/clinical decision, the product must not become condition-specific treatment or clinical decision support. This remains the governing boundary for every future professional idea.

Current local-first principles also remain authoritative:

1. `okello_food_tracker_v3` remains the main personal-state contract.
2. Historical nutrition and amount snapshots are not recalculated when catalogue values change.
3. Missing nutrition data remains missing; `null` is not zero.
4. Direct observations and estimator-derived values retain different provenance.
5. Shipped `ghana_` / `world_` catalogue records are product data, not user backup data.
6. A new remote service, account, server-side store or recurring per-user cost requires an explicit architecture/privacy/cost decision before implementation.

---

# 3. Current runtime → future-plane map

## A. Entry, boot and delivery

| Current module | Current responsibility | Classification | Future role / action |
|---|---|---|---|
| `app-v47-safe.html`, `index.html`, `app-v47.html` | Static app shell / safe entry | KEEP, then simplify | Maintain one canonical production shell after hosting migration. Avoid permanent duplicate entrypoints. |
| `bootstrap-v14.js` | Ordered runtime loading + service-worker update | EVOLVE | Keep one explicit composition root while static modules remain. Remove compatibility-only scripts as debt is retired. |
| `service-worker.js` | Offline application shell/cache | KEEP | Remains consumer-app infrastructure. Must not cache personal cloud data if a future cloud layer exists. |
| `styles.css`, `app-chrome-v1.js`, `ux-v2.js`, `interaction-v1.js`, `ios-exit-v1.js` | UI/interaction shell | KEEP / EVOLVE | Consumer presentation only. Do not mix future reviewer/professional permissions into these modules. |
| `update-v1.js` | Update/reload behaviour | KEEP | Continue to make static releases recoverable and understandable. |
| GitHub Pages diagnostic workflows | Delivery diagnostics | TECHNICAL DEBT after migration | GitHub remains source/CI. Retire Pages-specific production diagnostics once the old origin is no longer a migration source. |

### Delivery rule

Future hosting changes must not mutate the personal-storage contract implicitly. Moving origin is a data-migration event because browser storage is origin-scoped.

---

## B. Personal plane — authoritative user data

| Current module / store | Current responsibility | Classification | Future role / action |
|---|---|---|---|
| `state-repository-v46.js` | Central write boundary for main state | KEEP | Becomes the authoritative personal-plane repository. New code should not bypass it for `okello_food_tracker_v3`. |
| `storage-migration-v1.js` | v2→v3 migration, canonicalisation, quarantine/recovery | KEEP | Preserve as the sole schema/id migration boundary. Add migrations here, never in UI/catalogue modules. |
| `backup-v3.js` | Complete local backup, validation, staging, rollback, encrypted transfer | KEEP | Core portability mechanism. Must pass a real cross-origin/profile round trip before production-origin migration is considered complete. |
| `okello_food_tracker_v3` | Diary, recipes, custom foods, weight/history/templates | KEEP | Main personal record. Do not move server-side merely because accounts become conceivable. |
| favourites / satiety / activity / photo notes / shopping shelf / first-run / beta stores | Durable local supporting data | KEEP | Any future storage change must preserve backup classification and explicit durability. |
| `amount-quality-v3.js` + amount-quality contract | Weighed vs estimated amount provenance | KEEP | Becomes a core personal-evidence primitive. Professional features must consume provenance, not flatten it. |
| `piece-entry-v41.js`, `piece-usual-v41.js`, `piece-sheet-*`, `quick-add-piece-v41.js`, `countable-servings-v46.js` | Cultural/countable serving observations and gram conversion | KEEP / EVOLVE | Preserve direct count/unit observation separately from derived grams. This is a reusable portion-intelligence capability. |
| `personal-food-memory-v1.js` | On-device descriptive learning from user history | KEEP | Remains descriptive personal memory. Must not silently become population evidence or professional advice. |
| `recipe-assistant-v1.js` + saved recipe flow | User-owned recipe calculation | KEEP | Personal weighed recipe remains preferred evidence for that user's own variable dish. Do not promote a private recipe into the shared catalogue without a separate curation workflow. |
| `template-engine-v41.js`, `template-runtime-v41.js` | Repeated-meal templates | KEEP | Personal convenience; remain downstream of snapshot/provenance rules. |
| `activity-v1.js` | User activity history/goals | KEEP WITH BOUNDARY | General-wellbeing context only. No disease-management interpretation without regulatory decision. |
| `beta-feedback-v43.js`, `beta-metrics-v46.js` | Local beta evidence | KEEP during beta | Use for product-validation evidence; do not confuse engineering completion with market validation. |

### Personal-plane invariant

Historical records are observations. Catalogue updates, reviewer corrections and professional advice must never rewrite what the user originally logged.

---

## C. Knowledge plane — shared food intelligence

| Current module | Current responsibility | Classification | Future role / action |
|---|---|---|---|
| `ghana-foods.js` | Ghana/deeper regional catalogue | KNOWLEDGE PLANE | Keep as current seed data, not as a forever source-of-record format. Values need evidence/licence review. |
| `world-foods.js` | Global catalogue | KNOWLEDGE PLANE | Same contract as Ghana catalogue: broad coverage, evidence depth varies. |
| `catalog-storage-v46.js` | Separates shipped managed catalogue from user custom foods | KEEP | Critical boundary. Shared catalogue must not be duplicated into personal backup/state. |
| `food-data-layer-v2.js` | Nullable nutrients, schema validation, source/confidence/evidence fields | KNOWLEDGE PLANE / EVOLVE | Seed of the future evidence system. Extend rather than create a second database. |
| `meal-data-contract-v1.js` | Meal/food relationship contract | KEEP | Preserve semantic distinctions such as aliases vs base-food relationships. |
| `meal-catalog-facade-v1.js` | Common meal catalogue access | KEEP / EVOLVE | Becomes a stable consumer of versioned published knowledge. |
| `food-intelligence-v1.js` | Search ranking by text/source trust + controlled personal tie-breaks | KEEP | Continue to consume one catalogue; do not duplicate nutrition values. |
| `search-intelligence-v1.js`, `world-library-v1.js`, `catalog-ui-v41.js` | Discovery/search presentation | EVOLVE | Presentation over the knowledge plane. Must surface confidence/source where useful without pretending all regions have equal depth. |
| `nutrition-integrity-v46.js` | Nutrition validity/integrity checks | GOVERNANCE / KNOWLEDGE | Keep as executable guardrail; expand only when evidence rules become concrete. |
| `evidence-review-v46.js` | Review/evidence operations | KNOWLEDGE PLANE / EVOLVE | Treat as the current seed of reviewer workflow, but keep human review manual until spreadsheet churn proves a portal is needed. |
| `global-first-v47.js` | Global-first discovery/positioning | KEEP | Product scope remains global; Ghana/West Africa is evidence depth, not a user boundary. |

### Knowledge-plane rule

There must be **one published food knowledge source for the consumer app**. Reviewer tooling, spreadsheets or future portals may stage proposed changes, but they must not create an independent production catalogue.

### Knowledge-plane publication boundary

Today the shared catalogue is implemented as JavaScript/data files shipped inside the consumer application. That is appropriate while it serves one product.

If external buyer evidence later supports food intelligence as an independently distributed asset, crossing that boundary is a deliberate architecture/licensing decision. The canonical knowledge artefact would then need to be independently versionable, publishable and licensable while the consumer app becomes one downstream client of it.

Do **not** extract or build that separate distribution layer merely because it is architecturally imaginable. It is blocked by Gate C below.

---

## D. Packaged-product knowledge

| Current module | Responsibility | Classification | Future role / action |
|---|---|---|---|
| `product-data-v2.js` | Shared Open Food Facts retrieval/normalisation | KEEP | Preserve missingness, source metadata and exact-product semantics. |
| `category-rules-v1.js` | Narrow exact-match category interpretation | KEEP / EVOLVE | Data-driven rules only; no fuzzy clinical interpretation. |
| `scanner.js`, `scanner-launch-v1.js` | Barcode input | KEEP | Consumer input adapter. Keep remote lookup explicit and optional. |
| `shopping-v1.js`, `personal-shelf-v1.js` | Local product comparison/history | KEEP | Personal plane consumer of packaged-product knowledge. Shelf stays local unless a future cloud decision explicitly changes that. |
| `PRODUCT_DATA_ARCHITECTURE.md` contract | Missingness/category/product-source rules | KEEP | Remains governing boundary for future product-data features. |

Packaged-product data and cultural food-composition data can share evidence concepts, but must not be collapsed into one provenance rule: exact packet data, user recipe data and generic composition references answer different questions.

---

## E. Recommendation / guidance machinery already in the codebase

These modules exist and must be classified carefully. Their presence does **not** automatically justify future professional or clinical use.

| Current module | Current role | Classification | Future role / action |
|---|---|---|---|
| `target-safety-v46.js` | Tracking-only / own-target / confirmed-target safety | KEEP | Governing safety layer for current target-dependent features. |
| `target-safety-bridge-v47.js` | Compatibility protection against legacy starter targets | TECHNICAL DEBT | Compatibility-only; active removal work is tracked outside this strategic document. |
| `first-run-v44.js` | Onboarding/profile/legacy target defaults | EVOLVE + TECHNICAL DEBT | Keep first-run preference/profile boundary; operational remediation belongs in the release issue tracker. |
| `smart-support.js`, `smart-portion-output-v41.js` | Support/portion output helpers | KEEP WITH BOUNDARY | General food-literacy calculations only; provenance must remain visible. |
| `day-forecast-v1.js`, `FORECAST_ARCHITECTURE.md` | Habit/day projection | KEEP WITH BOUNDARY | Descriptive general-wellbeing projection; do not repurpose as clinical forecast. |
| `smart-meal-fit-v41.js`, `smart-meal-guard-v42.js`, `smart-meal-runtime-v41.js`, `smart-v3.js`, `build-my-meal-v46.js` | Target/context-driven meal/portion assistance | KEEP ONLY WITH CURRENT SAFETY BOUNDARY; REVIEW BEFORE EXPANSION | Do not let these become the hidden engine for condition-specific or clinician-directed recommendations. Professional/clinical use is BLOCKED BEFORE REGULATORY GATE. |
| `activity-safety-v46.js` | Activity safety constraints | KEEP | Prevent activity context from escalating claims. |
| `speech-guard-v46.js` | Disables/guards speech boundary | KEEP until intentionally revisited | Any remote speech service would require network/privacy decision. |

### Absolute rule

Existing recommendation code is **not** a shortcut around future regulatory assessment. A professional-set therapeutic target, condition-specific logic, diagnostic/treatment recommendation or clinical alert requires an explicit intended-purpose and regulatory decision before implementation.

---

## F. Governance, trust and evidence controls

| Current artefact/module | Classification | Future role / action |
|---|---|---|
| `INTENDED_PURPOSE.md` | GOVERNANCE / KEEP | Top-level red-line document. Change only through explicit product/regulatory decision. |
| `FOOD_EVIDENCE_POLICY.md` | GOVERNANCE / KEEP | Reviewer workflow must apply the same source/licence rules; reviewer input does not bypass them. |
| `FOOD_SOURCE_OF_RECORD_DECISION.md` | GOVERNANCE / KEEP | Production evidence hierarchy. Reviewer suggestions do not bypass licence gate. |
| `COMMERCIAL_FOOD_SOURCE_REGISTER.md` | GOVERNANCE / EVOLVE | Track commercial usability of proposed sources before extraction. |
| `DUE_DILIGENCE_REGISTER.md` | GOVERNANCE / KEEP | Continue to track unresolved external/legal/clinical evidence. |
| `NETWORK_AND_STORAGE_INVENTORY.md` | GOVERNANCE / KEEP | Must be updated before any new endpoint/store/account/backend is merged. |
| `trust-v46.js`, `privacy.html`, `beta-terms.html`, `third-party-notices.html` | GOVERNANCE / EVOLVE | Consumer trust layer. Future cloud/professional processing would require a new privacy/data-controller assessment, not copy changes alone. |
| CI regression suites (`bundle-*`, migration, snapshot, write rejection, backup, evidence, target safety, etc.) | KEEP | Preserve behavioural contracts while implementation is simplified. |

---

# 4. Technical-debt boundary

This strategic document classifies technical debt so that compatibility code is not mistaken for future product design. It is **not** the operational backlog.

Release-sensitive remediation must live in the issue/release tracker where it is visible before the next release. The active starter-target/bridge remediation is tracked in **GitHub issue #12**. Future concrete debt should be tracked the same way.

Versioned predecessor modules and superseded handlers may remain for tests, recovery or compatibility, but new functionality must go into the current runtime owner rather than an older predecessor.

GitHub Pages-specific diagnostics remain temporary while the old origin is still a migration/recovery concern; they are not long-term production architecture.

---

# 5. The three hard future gates

## Gate A — cloud/account/sync economics + privacy gate

No account system, server-side personal store, recurring per-user API dependency or background sync should be introduced until there is a user problem that cannot be solved acceptably by local storage + explicit backup/export/share.

Before implementation, record:

- exact user problem requiring server state;
- expected active-user count;
- monthly storage/compute/API/egress/support cost per active user;
- authentication/account-recovery approach;
- encryption and backup model;
- deletion/export obligations;
- breach/availability implications;
- controller/processor/privacy assessment;
- who pays and at what price.

**Current status: gate not passed.**

## Gate B — professional/clinical/regulatory gate

Professional collaboration is not an automatic next feature.

Before building professional-set treatment targets, condition-specific guidance, clinical alerts, clinician-facing treatment recommendations or comparable workflows:

- define intended purpose precisely;
- obtain suitable regulatory/clinical advice;
- assess UK medical-device implications and any other target-market requirements;
- determine quality/risk-management obligations;
- define professional identity/credential model;
- define audit/advice-record requirements;
- only then design the regulated branch.

**Current status: gate not passed.**

## Gate C — independent knowledge publication/licensing gate

The current catalogue remains an internal product asset shipped with the app until external evidence justifies independent distribution.

Before creating an API, downloadable database, separately licensed dataset or other independent knowledge product, record:

- external buyer/user evidence showing a real workflow need;
- intended distribution and commercial model;
- canonical data format and versioning policy;
- complete rights/licence chain for included sources and derived records;
- attribution obligations;
- update/correction policy;
- separation from all personal/user-authored data;
- what remains app-specific versus part of the independently published knowledge asset.

**Current status: gate not passed.**

---

# 6. Reviewer/evidence network: build only when manual workflow hurts

Current workflow:

```text
catalogue snapshot
      ↓
review spreadsheet
      ↓
professional challenge / recommendation
      ↓
source + licence + preparation/basis check
      ↓
accept / reject / unresolved
      ↓
published catalogue change
```

This should remain spreadsheet/manual until evidence proves the workflow itself is a problem.

## Reviewer source-use rule

The source/licence gate binds reviewers as well as the product team.

A reviewer may consult any credible source to **challenge** an existing value or identify an evidence gap. That does not automatically make that source eligible to supply a production value.

For every recommendation intended to become production evidence, record at minimum:

- exact source title/database/article;
- source identifier, DOI, URL, table/code or other stable locator where available;
- licence/reuse status;
- exact food/preparation represented by the source;
- nutrient basis and units;
- any conversion, averaging, recipe derivation or other transformation performed;
- reviewer identity and review date.

The production source must pass `FOOD_EVIDENCE_POLICY.md` and `FOOD_SOURCE_OF_RECORD_DECISION.md` before acceptance. WAFCT may be used for scientific comparison/mapping but must not become a commercial production source unless appropriate commercial permission is confirmed. Sources already identified as potentially commercially reusable still require identity/preparation and attribution checks; a permissive licence does not make a poor food match valid.

If a reviewer cannot identify the source or its reuse position, the finding remains a **challenge** or **unresolved recommendation**, not a clean production correction.

Reviewer instructions and spreadsheets should state this rule up front so provenance problems do not enter the dataset invisibly.

## What must be measured with Edem and the next reviewers

- time to first response;
- number of chasers required;
- rows reviewed / rows skipped;
- estimated reviewer time;
- difficulty of locating sources vs judging plausibility;
- whether reviewer would repeat the exercise;
- whether they would repeat it unpaid;
- what incentive/payment/attribution would make it repeatable;
- disagreement between reviewers on overlapping foods;
- proportion of proposed changes that fail the licence/source gate.

If five reviewers create genuine spreadsheet/version-control pain, that is evidence for an evidence-review portal. If reviews do not arrive, a portal is not the solution.

## Reviewer contribution states

A future structured workflow should preserve three different things:

1. **Challenge** — reviewer believes current value/assumption is weak or wrong.
2. **Recommendation** — reviewer proposes a value/range/model and identifies their basis.
3. **Production evidence** — proposed basis has passed licence, preparation, nutrient-basis and methodological checks and is permitted to enter the published catalogue.

A professional opinion is not automatically source provenance.

---

# 7. Food-intelligence commercial hypothesis: separate validation track

The evidence-rich catalogue is **not yet a second business**. It is a hypothesis.

Before building an API, licensing portal, B2B dashboard or dedicated commercial database product, conduct at least three problem interviews with materially different potential users, for example:

- a digital-health / food-tracking company;
- an NHS/dietetics or research organisation;
- a developer/company building nutrition functionality.

Ask about a specific recent case involving African/culturally diverse food data, what source they used, what failed, how they handled the gap, time/cost, and whether stronger provenance/coverage would change a real workflow.

Do not count reviewer enthusiasm as B2B demand.

**Current Food Intelligence commercial validation: 0 until external behavioural/buyer evidence exists.**

---

# 8. Future-only architecture — explicitly not built now

The following are architectural placeholders, not backlog commitments:

| Future capability | Status |
|---|---|
| Reviewer web portal | FUTURE ONLY — only after manual-review pain |
| User accounts | BLOCKED BY GATE A |
| Cross-device personal sync | BLOCKED BY GATE A |
| Server-side personal diary | BLOCKED BY GATE A |
| Professional identity/credential service | FUTURE ONLY; needed only if collaboration branch is justified |
| Client sharing/consent grants | BLOCKED BY GATES A + B depending on intended use |
| Professional advice objects | FUTURE ONLY; attractive audit model, but intended purpose must be assessed before clinical use |
| Professional-set therapeutic targets | BLOCKED BY GATE B |
| Condition-specific recommendations | BLOCKED BY GATE B |
| Clinic multi-tenancy | FUTURE ONLY; not a consumer-beta dependency |
| Appointment/video/payment marketplace | FUTURE ONLY; plug-in concern, not core food engine |
| Independently published/versioned food dataset | BLOCKED BY GATE C |
| Commercial food-data API/licensing product | BLOCKED BY GATE C |

---

# 9. If a professional collaboration branch is eventually approved

The correct record model is additive, not mutative.

```text
USER OBSERVATION (immutable snapshot)
meal / amount / provenance / nutrition snapshot / timestamp
                │
                └──► PROFESSIONAL ADVICE OBJECT
                     author identity
                     timestamp
                     related observation(s)
                     advice text / structured recommendation
                     reason / evidence reference
                     status / supersession history
```

A professional must not silently rewrite the user's historical observation. This protects both the user and the professional by preserving what was recorded and exactly what advice was given, when and by whom.

This model is **future-only** until the relevant gate is passed.

---

# 10. Near-term architecture work — grounded in what already exists

Do these before creating new platform layers:

1. **Complete the real Backup v3 migration test** across origins/profiles, including reload persistence and failed-import rollback.
2. **Keep the evidence review manual** with the Edem/African reviewer spreadsheet; record review economics and friction.
3. **Bind reviewer submissions to the source/licence gate** before any accepted catalogue correction is published.
4. **Do not create another food database.** Improve `food-data-layer-v2` / published managed catalogue boundaries when evidence requires it.
5. **Run three B2B problem interviews** before treating food intelligence as a commercial product line.
6. **Run the consumer beta separately.** Consumer retention, reviewer-network viability and B2B data demand are three different scoreboards.
7. **Do not add accounts, sync, independent data publication or professional treatment workflow as incidental implementation details.** Each remains behind its named gate.
8. **Track release debt operationally.** Strategic classification belongs here; concrete pre-release remediation belongs in issues such as #12.

---

# 11. Definition of architectural success

This architecture is working if:

- a catalogue correction improves future food lookups without modifying historical diary snapshots;
- a reviewer can improve food evidence without seeing any consumer diary;
- every accepted reviewer-driven correction has a traceable source, reuse/licence position, preparation match and review record;
- local users can continue to use the core app without an account or recurring backend dependency;
- personal recipe evidence remains personal unless deliberately promoted through a separate reviewed process;
- missing data remains missing across catalogue, logs, backup and restore;
- current food-literacy functionality stays on the safe side of the intended-purpose boundary;
- future professional/cloud/independent-publication ideas cannot enter production without their explicit gate;
- market evidence determines which new infrastructure gets built.

The architecture should make the cheapest safe path the default and make expensive, regulated, privacy-expanding or rights-sensitive paths require conscious decisions.