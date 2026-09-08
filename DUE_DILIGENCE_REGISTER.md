# Independent due-diligence remediation register

Baseline reviewed: production v45, commit `8e6765ffd355f210fc8369756a5b5ebbdc00f0d6`.

Status meanings: **Open**, **Mitigated**, **Closed**, **Accepted**, **Deferred**.

| ID | Finding | Severity | Target | Status | Closure evidence required |
| --- | --- | --- | --- | --- | --- |
| DD-F01 | Privacy claim understates network egress / browser speech may be remote | High | v46 | Mitigated | Network inventory, in-app disclosure, Web Speech feature disabled, privacy notice |
| DD-F02 | Complete backup incomplete and non-transactional | High | v46 | Mitigated | Backup v3 includes every durable store, stages writes, verifies, rolls back on failure |
| DD-F03 | Multiple independent writers to one monolithic main store | High | v46-v47 | Mitigated | State revision repository gates legacy writes; next stage removes compatibility direct-write paths and managed catalogue persistence |
| DD-F04 | Food catalogue lacks auditable source-level provenance | High | v46-v48 | Open | Evidence schema lands in v46; top-used foods require source review before closure |
| DD-F05 | Missing nutrients coerced to zero | High | v46 | Mitigated | Nullable food schema, nullable custom-food fields, log completeness snapshot, regression tests |
| DD-F06 | Privacy/public-launch governance incomplete | High | v46 + pre-launch | Mitigated | Privacy/storage notice, delete-local-data control, adult beta position, intended-purpose record; operator legal identity/contact and formal ICO/DPIA assessment remain pre-launch blockers |
| DD-F07 | Smart Portion driven by unconfirmed generic targets | High | v46 | Mitigated | New users choose tracking-only or enter their own targets before target-based guidance |
| DD-F08 | Sodium/salt absent from diary | Medium | v46-v48 | Mitigated | Salt field and partial-total UI added; source coverage remains ongoing |
| DD-F09 | Open Food Facts licence/API governance incomplete | Medium | v46 | Mitigated | API v3, visible attribution and third-party notices; browser identification constraints documented |
| DD-F10 | Activity calories use 158 kg default fallback | Medium | v46 | Mitigated | Active-kcal output suppressed unless a user weight is available |
| DD-F11 | Important invariants rely on interception/runtime ownership | Medium | v47 | Open | Move amount-quality provenance into governed repository write contract and retire global amount-quality storage interception |
| DD-F12 | First meal still cognitively heavy | Medium | v48 | Open | One coherent Build My Meal path verified on small-screen real devices |
| DD-F13 | UI precision exceeds evidence precision | Medium | v46-v48 | Mitigated | Estimate/evidence badges and approximate remaining wording where logged evidence is uncertain |
| DD-F14 | Children-access position unresolved | Medium | v46 | Mitigated | Adult-only beta gate and policy record; broader launch requires proportionate age/Children's Code assessment |
| DD-F15 | No central evidence stream for 30-50 user beta | Medium | beta phase | Accepted for current scale | Structured local metrics/feedback export first; any server endpoint requires explicit privacy/cost decision |

## Non-code launch blockers

The following cannot be truthfully completed by code alone and must remain visible rather than being guessed:

1. final operating legal entity/name;
2. formal privacy contact/address;
3. final ICO fee self-assessment for that entity;
4. final DPIA/controller/Article 9 analysis signed off for public launch;
5. food-composition review by an appropriately qualified nutrition professional for the priority catalogue;
6. real-device beta evidence from target users.

## Release principle

A finding is not closed because copy changed. It is closed only when the relevant runtime behaviour, migration/backup behaviour and regression evidence agree.
