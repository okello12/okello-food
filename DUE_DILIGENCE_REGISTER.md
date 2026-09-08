# Independent due-diligence remediation register

Baseline reviewed: production v45, commit `8e6765ffd355f210fc8369756a5b5ebbdc00f0d6`.

The primary distinction in this register is **work type**. Engineering findings can be closed by code plus regression evidence. External findings cannot be closed by a commit and must retain an accountable owner and due date/evidence gate.

Status meanings: **Open**, **Mitigated**, **Closed**, **Accepted**, **Deferred**, **External blocker**.

| ID | Finding | Severity | Work type | Owner | Target / due | Status | Closure evidence required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DD-F01 | Privacy claim understates network egress / browser speech may be remote | High | Engineering + privacy | Builder/privacy | v46 + launch review | **Closed in product; external privacy review remains under F06** | Network inventory, in-app disclosure, Web Speech feature disabled, privacy/storage notice |
| DD-F02 | Complete backup incomplete and non-transactional | High | Engineering | Builder | v46-v47 | **Closed** | Backup v3 covers durable stores, validates before change, stages and verifies writes, rolls back failures; v47 distinguishes quota failure and explicitly surfaces partial rollback/mixed-state failure |
| DD-F03 | Multiple independent writers to one monolithic main store | High | Engineering | Builder | v46-v47 | **Mitigated** | State repository revision-gates the main store and rejected compatibility writes cannot fail silently; remaining legacy compatibility writers are tracked under F11 rather than represented as fully retired |
| DD-F04 | Food catalogue lacks auditable source-level provenance | High | Mixed | Builder + nutrition reviewer + rights clearance | v46-v48 | **Open / external evidence work** | Evidence schema and source-of-record policy are implemented; priority foods still require licensed food-level source mapping and qualified nutrition sign-off |
| DD-F05 | Missing nutrients coerced to zero | High | Engineering + nutrition | Builder | v46 | **Closed** | `food-data-layer-v1.js` retired; shipped v46 catalogue/custom/OFF integrity paths preserve unavailable nutrients as null; old `Number(f.kcal)||0` normalisation is absent from the runtime bundle; partial nutrition is surfaced as incomplete rather than zero |
| DD-F06 | Privacy/public-launch governance incomplete | High | Mixed | Founder/privacy | 30 Sep 2026 for launch assessment | **External blocker** | Privacy/storage notice is implemented; final controller/Article 9 analysis, privacy contact, DPIA and ICO fee assessment still require founder/legal facts and external judgement |
| DD-F07 | Smart Portion driven by unconfirmed generic targets | High | Engineering + nutrition | Builder | v46 | **Closed in product** | New users choose tracking-only or enter targets they already use; target-based Smart Portion stays off until a target mode is confirmed |
| DD-F08 | Sodium/salt absent from diary | Medium | Mixed | Builder + nutrition reviewer | v46-v48 | **Mitigated** | Nullable salt field and partial-total UI are implemented; licensed salt coverage and nutrition review remain source-level work |
| DD-F09 | Open Food Facts licence/API governance incomplete | Medium | Engineering + legal/IP | Builder | v46 | **Closed in integration; ongoing licence hygiene** | API v3, visible attribution/third-party notices, source licence metadata and packet-first evidence policy implemented; future OFF use remains subject to the standing licence gate |
| DD-F10 | Activity calories use 158 kg default fallback | Medium | Engineering | Builder | v46 | **Closed** | Active-kcal output is suppressed unless a user weight is available; no 158 kg fallback is allowed to become user-facing calorie expenditure |
| DD-F11 | Important invariants rely on interception/runtime ownership | Medium | Engineering | Builder | v47+ | **Open** | Amount-quality provenance already runs inside repository middleware, but remaining legacy main-store compatibility paths should be retired into explicit domain/repository writes over time |
| DD-F12 | First meal still cognitively heavy | Medium | Product + engineering | Builder + beta users | v47-v48 / real-device beta | **Mitigated in product; external usability evidence open** | Build My Meal provides one coherent mixed-meal path; v47 adds global starter discovery. Small-screen observed beta must still prove first-use and one-handed usability |
| DD-F13 | UI precision exceeds evidence precision | Medium | Product + nutrition | Builder | v46-v48 | **Mitigated** | Estimate/evidence badges, partial-nutrition labels and approximate remaining wording exist; variable composite-food confidence still depends on source review |
| DD-F14 | Children-access position unresolved | Medium | Privacy/product | Founder/privacy | Before broader public launch | **External blocker** | Adult-only beta gate is implemented; proportionate Children's Code/age-access assessment is still required for broader launch strategy |
| DD-F15 | No central evidence stream for 30-50 user beta | Medium | Product evidence | Founder/beta ops | 7 Dec 2026 | **Accepted for current scale** | Local metrics/feedback exports and `BETA_90_DAY_PROTOCOL.md` are implemented; 30-50-user retention evidence must still be collected; any server endpoint requires a separate privacy/cost decision |

## External launch and diligence blockers

These are not engineering tickets. They stay open even when every runtime test is green.

| Blocker | Owner | Due / gate | Required evidence |
| --- | --- | --- | --- |
| FAO/WAFCT commercial permission decision | Founder / rights clearance | 22 Sep 2026, before any WAFCT production extraction | Written FAO permission with usable commercial terms, or recorded decision not to use WAFCT production values |
| Priority food-composition professional review | Registered dietitian / food-composition reviewer | 16 Oct 2026 for first priority tranche | Signed/reviewed source mapping and plausibility review for the agreed priority foods |
| ICO fee self-assessment | Founder/privacy | 30 Sep 2026, before broad public beta | Saved result and rationale for the operating entity |
| DPIA/controller/Article 9 analysis | Founder/privacy, external review if available | 30 Sep 2026, before broad public beta | Completed assessment with decision, lawful-basis/Article 9 position and residual risks |
| Legal operator identity and privacy contact | Founder | Before broad public beta | Final entity/trading name and user-facing privacy contact details |
| 30-50 target-user retention evidence | Founder/beta ops | 7 Dec 2026 | Predeclared beta metrics, week-4 repeat-use evidence, correction patterns and qualitative outcomes across multiple food backgrounds |
| Laboratory commissioning decision | Founder + nutrition reviewer | After licensed-source gap analysis, not before | Written gap list, supplier quotes, sample/recipe protocol and data-rights terms |

## Engineering evidence gates

| Gate | Status | Evidence |
| --- | --- | --- |
| v46 bundle/version/cache alignment | **Passed** | Production v46 bootstrap, service worker and runtime manifest agreed and deployment was verified |
| Historical real-device migration | **Passed** | Actual 17:52 phone export: 3 entries in / 3 entries out, historical fields unchanged, duplicate okro catalogue identity removed, second pass byte-identical with no writes |
| v45 `countUnit` retirement | **Accepted residual risk; exact shipped-code integration pass** | No physical post-v45 device export is available. `v45-countunit-backup-upgrade.test.js` executes the byte-identical shipped v45 writer/piece/backup blobs, creates a three-egg backup through the real shipped code, then proves v46 removes only `countUnit` and the second pass performs no write. This is not represented as a physical-device test. |
| Backup v3 restore/rollback | **Passed** | Whole bundle validates first; planned keys stage with read-back verification; current values are snapshotted; committed values are verified; main rollback uses the state repository |
| Backup staging quota diagnosis | **Passed on v47 branch** | `backup-hardening-v47.test.js` injects a staging `QuotaExceededError`, verifies the current main state is untouched and requires the explicit insufficient-storage message |
| Partial rollback diagnosis | **Passed on v47 branch** | `backup-hardening-v47.test.js` injects a commit failure plus a rollback-store failure and requires `restore-rollback-partial`, failed-store evidence and a mixed-state user warning |
| State revision/conflict behaviour | **Passed** | Expected-revision compare-and-swap and stale-incoming-revision guards reject stale writes; successful writes are re-read to verify revision; middleware runs inside commit |
| Rejected-write user experience | **Passed** | Governed flows check `ok:false`; legacy main-store rejection throws so callers cannot continue into false-success UI; trust layer surfaces conflict/quota/integrity failure and reloads durable state after legacy rejection |
| v47 global positioning contract | **Passed on branch** | `global-first-v47.test.js` requires a global/mixed default, eight discovery regions, explicit "shortcuts only" semantics and the rule that observed behaviour outranks declared discovery preference |
| v47 historical regression | **Passed on branch** | Historical storage, migration, meal, piece, Smart Meal, template, feedback, first-run, v45 compatibility, v46 write-safety, v47 bundle/global/backup tests and syntax checks are green at branch head |

## Standing trust rule

**Licence before extraction. Evidence before recommendation. Invariant before convenience.**

Each clause records a failure already encountered in this project rather than an abstract principle:

- **Licence before extraction:** two independent reviews recommended WAFCT 2019 before its non-commercial licence was checked. Source review now gates on commercial reuse rights before extraction effort.
- **Evidence before recommendation:** unsupported product claims and inferred evidence, including an earlier `#hubScanBtn` guess and personas being treated as testers, showed that plausible inference must not be presented as observed product evidence.
- **Invariant before convenience:** coercions such as `Number(f.kcal)||0` made implementation convenient while violating the stated rule that missing data remains missing. Data-contract invariants now take precedence over convenience defaults.

These rules apply to code, product claims, research and diligence material.

## Source licensing and global-coverage rule

A scientific source does not enter the production review queue until commercial reuse rights have been checked. Source selection follows food identity and preparation, not nationality.

For priority review:

1. culturally distinctive African/Caribbean composite foods → commercially reusable analytical literature first;
2. generic/global ingredients → USDA FoodData Central CC0 and, where the UK identity is closer, CoFID/OGL;
3. exact branded products → packet label first, Open Food Facts as convenience/source evidence;
4. the user's own variable composite dishes → their recipe and final cooked weight;
5. no adequate licensed source → explicit evidence gap, then additional literature mapping, FAO permission or commissioned analysis if commercially justified.

Global usefulness does not require pretending every cuisine is already equally validated. It requires reliable generic foods, exact-product escape routes, user recipes/custom foods, and cultural catalogue values only where the evidence is suitable and licensed.

See `FOOD_SOURCE_OF_RECORD_DECISION.md`, `COMMERCIAL_FOOD_SOURCE_REGISTER.md`, `FOOD_EVIDENCE_POLICY.md` and `BETA_90_DAY_PROTOCOL.md`.

## Release principle

A finding is not closed because copy changed. It is closed only when the relevant runtime behaviour, migration/backup behaviour and regression evidence agree. External blockers are closed only by the named external evidence, never by code alone.
