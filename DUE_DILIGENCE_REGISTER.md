# Independent due-diligence remediation register

Baseline reviewed: production v45, commit `8e6765ffd355f210fc8369756a5b5ebbdc00f0d6`.

The primary distinction in this register is **work type**. Engineering findings can be closed by code plus regression evidence. External findings cannot be closed by a commit and must retain an accountable owner and due date/evidence gate.

Status meanings: **Open**, **Mitigated**, **Closed**, **Accepted**, **Deferred**, **External blocker**.

| ID | Finding | Severity | Work type | Owner | Target / due | Status | Closure evidence required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DD-F01 | Privacy claim understates network egress / browser speech may be remote | High | Engineering + privacy | Builder/privacy | v46 | Mitigated | Network inventory, in-app disclosure, Web Speech feature disabled, privacy notice |
| DD-F02 | Complete backup incomplete and non-transactional | High | Engineering | Builder | v46 | Mitigated | Backup v3 includes every durable store, stages writes, verifies, rolls back on failure |
| DD-F03 | Multiple independent writers to one monolithic main store | High | Engineering | Builder | v46-v47 | Mitigated | State revision repository gates legacy writes; compatibility direct-write paths and managed catalogue persistence are retired in stages |
| DD-F04 | Food catalogue lacks auditable source-level provenance | High | Mixed | Builder + nutrition reviewer + rights clearance | v46-v48 | Open | Evidence schema and source-of-record policy land in code; priority foods require licensed source review and qualified nutrition sign-off |
| DD-F05 | Missing nutrients coerced to zero | High | Engineering + nutrition | Builder | v46 | Mitigated | Nullable food schema, nullable custom-food fields, log completeness snapshot, regression tests |
| DD-F06 | Privacy/public-launch governance incomplete | High | Mixed | Founder/privacy | 30 Sep 2026 for launch assessment | External blocker | Privacy/storage notice in app plus final controller/Article 9 analysis, privacy contact, DPIA and ICO fee assessment for operating entity |
| DD-F07 | Smart Portion driven by unconfirmed generic targets | High | Engineering + nutrition | Builder | v46 | Mitigated | New users choose tracking-only or enter their own targets before target-based guidance |
| DD-F08 | Sodium/salt absent from diary | Medium | Mixed | Builder + nutrition reviewer | v46-v48 | Mitigated | Salt field and partial-total UI added; licensed source coverage and nutrition review remain ongoing |
| DD-F09 | Open Food Facts licence/API governance incomplete | Medium | Engineering + legal/IP | Builder | v46 | Mitigated | API v3, visible attribution and third-party notices; browser identification constraints documented |
| DD-F10 | Activity calories use 158 kg default fallback | Medium | Engineering | Builder | v46 | Mitigated | Active-kcal output suppressed unless a user weight is available |
| DD-F11 | Important invariants rely on interception/runtime ownership | Medium | Engineering | Builder | v47 | Open | Move amount-quality provenance into governed repository write contract and retire global amount-quality storage interception |
| DD-F12 | First meal still cognitively heavy | Medium | Product + engineering | Builder + beta users | v48 / real-device beta | Open | One coherent Build My Meal path verified on small-screen real devices |
| DD-F13 | UI precision exceeds evidence precision | Medium | Product + nutrition | Builder | v46-v48 | Mitigated | Estimate/evidence badges and approximate remaining wording where logged evidence is uncertain |
| DD-F14 | Children-access position unresolved | Medium | Privacy/product | Founder/privacy | Before broader public launch | External blocker | Adult-only beta gate in product plus proportionate Children’s Code/age-access assessment for broader launch |
| DD-F15 | No central evidence stream for 30-50 user beta | Medium | Product evidence | Founder/beta ops | 7 Dec 2026 | Accepted for current scale | Structured local metrics/feedback export first; 30-50-user retention evidence collected; any server endpoint requires explicit privacy/cost decision |

## External launch and diligence blockers

These are not engineering tickets. They stay open even if every v46 test is green.

| Blocker | Owner | Due / gate | Required evidence |
| --- | --- | --- | --- |
| FAO/WAFCT commercial permission decision | Founder / rights clearance | 22 Sep 2026, before any WAFCT production extraction | Written FAO permission with usable commercial terms, or recorded decision not to use WAFCT production values |
| Priority food-composition professional review | Registered dietitian / food-composition reviewer | 16 Oct 2026 for first priority tranche | Signed/reviewed source mapping and plausibility review for the agreed priority foods |
| ICO fee self-assessment | Founder/privacy | 30 Sep 2026, before broad public beta | Saved result and rationale for the operating entity |
| DPIA/controller/Article 9 analysis | Founder/privacy, external review if available | 30 Sep 2026, before broad public beta | Completed assessment with decision, lawful-basis/Article 9 position and residual risks |
| Legal operator identity and privacy contact | Founder | Before broad public beta | Final entity/trading name and user-facing privacy contact details |
| 30-50 target-user retention evidence | Founder/beta ops | 7 Dec 2026 | Predeclared beta metrics, week-4 repeat-use evidence, correction patterns and qualitative outcomes |
| Laboratory commissioning decision | Founder + nutrition reviewer | After licensed-source gap analysis, not before | Written gap list, supplier quotes, sample/recipe protocol and data-rights terms |

## v46 pre-merge evidence gates

The following are release gates, not product-roadmap aspirations.

| Gate | Status | Evidence |
| --- | --- | --- |
| Bundle/version/cache alignment | Passed | v46 full regression confirms the branch bundle, service worker and runtime manifest agree |
| Historical real-device migration | Passed | Actual 17:52 phone export: 3 entries in / 3 entries out, historical fields unchanged, duplicate okro catalogue identity removed, second pass byte-identical with no writes |
| v45 `countUnit` retirement | **Accepted residual risk; exact shipped-code integration pass** | No physical post-v45 device export is available. `v45-countunit-backup-upgrade.test.js` executes the byte-identical shipped v45 `countable-servings-v45.js`, `piece-entry-v41.js` and `backup-v2.js` blobs from production commit `8e6765f`, creates a three-egg backup through the real v45 writer/backup code, then proves v46 removes only `countUnit` and the second pass performs no write. Synthetic matching/missing/conflict coverage also remains. This is not represented as a physical-device test. |
| Backup v3 restore/rollback | Pending final focused review | Complete-store manifest, staging, verification and rollback must remain green against representative backups |
| State revision/conflict behaviour | Pending final focused review | Stale-state rejection and compatibility writes must be verified under expected legacy/runtime paths |

## Standing trust rule

**Licence before extraction. Evidence before recommendation. Invariant before convenience.**

Each clause records a failure already encountered in this project rather than an abstract principle:

- **Licence before extraction:** two independent reviews recommended WAFCT 2019 before its non-commercial licence was checked. Source review now gates on commercial reuse rights before extraction effort.
- **Evidence before recommendation:** unsupported product claims and inferred evidence, including an earlier `#hubScanBtn` guess and personas being treated as testers, showed that plausible inference must not be presented as observed product evidence.
- **Invariant before convenience:** coercions such as `Number(f.kcal)||0` made implementation convenient while violating the stated rule that missing data remains missing. Data-contract invariants now take precedence over convenience defaults.

These rules apply to code, product claims, research and diligence material.

## Source licensing rule

A scientific source does not enter the production review queue until commercial reuse rights have been checked. Two independent reviews recommended WAFCT 2019 before the non-commercial licence was checked; the process now treats licence suitability as a gate before extraction effort.

For the Top-75 review, source selection is type-specific rather than one flat table hierarchy: culturally distinctive Ghanaian/West African composite foods are checked against commercially reusable African analytical literature first; CoFID is the reference lane for matching generic UK foods and ingredients; packet labels govern exact branded products; user recipes govern the user's own variable composite dishes.

See `FOOD_SOURCE_OF_RECORD_DECISION.md` and `FOOD_EVIDENCE_POLICY.md`.

## Release principle

A finding is not closed because copy changed. It is closed only when the relevant runtime behaviour, migration/backup behaviour and regression evidence agree. External blockers are closed only by the named external evidence, never by code alone.
