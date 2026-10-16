# Okello Food privacy / DPIA draft

Status: **working draft, not signed off legal advice**. Prepared from the v47 product architecture on 8 September 2026. Founder/operator facts, lawful-basis decisions and any external privacy review remain open.

ICO reference: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/

The ICO says a DPIA is required where processing is likely to result in high risk to individuals. Its current guidance also says special-category/highly personal data are factors that increase the case for a DPIA and recommends documenting the decision. Okello Food should complete this assessment even if final review concludes the current small, device-local beta is not legally within an automatic DPIA category.

## 1. Intended purpose

Okello Food is an adult food-literacy and general-wellbeing application. It helps people record foods, understand approximate portions and nutrition, calculate their own recipes, and review their own eating history.

It is not intended to diagnose, prevent, monitor or treat disease; calculate medication; make clinical decisions; or provide condition-specific medical nutrition treatment.

## 2. Product architecture and processing map

### Device-local processing

The application intentionally stores the main diary and most user state in browser storage on the user's own device. Current durable categories include:

- food diary and nutrition snapshots;
- custom foods and recipes;
- user-confirmed calorie/protein targets or tracking-only preference;
- weight history and activity records;
- favourites and satiety observations;
- first-run/familiar-food discovery preference;
- local beta feedback and local beta timing/events;
- backup/export preferences and related local state.

No account is required and no centrally hosted Okello Food diary database exists in the current architecture.

### Network processing

Current intended network destinations are limited to:

- **GitHub Pages / GitHub infrastructure** to deliver the PWA and static assets;
- **Open Food Facts** when a person explicitly performs an online product search or barcode lookup, including ordinary web-request metadata such as IP address;
- **Open Food Facts-hosted product images** where returned product data contains those images;
- **jsDelivr** for the barcode-scanner library, with the dependency also cached for offline use after successful retrieval.

In-app browser SpeechRecognition is disabled. Users may independently use operating-system keyboard dictation, which is outside Okello Food's own speech-recognition implementation and governed by their device/provider settings.

### Voluntary beta exports

Local beta metrics and structured feedback remain on device until a participant chooses to export/share them. If a participant sends an export to the operator, that received copy becomes operator-held data and must be governed separately from the purely local copy.

## 3. Personal-data / special-category screening

A food name by itself is not necessarily health data. However, the application can process information such as weight, activity, calorie/protein targets, satiety and longitudinal eating patterns. Depending on identifiability and context, these may constitute or reveal data concerning health, which is special-category data under Article 9.

The following questions require final legal/privacy determination:

1. For processing performed solely inside the user's browser, to what extent is the Okello Food operator a controller given that the operator designs the purposes and means but does not receive the diary?
2. Which local fields are personal data in the operator's hands or from the perspective required by UK GDPR identifiability rules?
3. For any special-category processing for which the operator is controller, what Article 6 lawful basis and Article 9 condition apply?
4. Is explicit consent appropriate/necessary for any special-category element, or is another lawful basis/condition a better fit?
5. What separate basis applies when the operator receives a voluntary beta export, support message or other identifiable user-submitted evidence?

No answer should be inferred merely from the local-first architecture. The final position must be documented before broad public launch.

## 4. PECR / browser-storage assessment

The ICO's final April 2026 storage-and-access guidance states that PECR applies to web storage as well as cookies. It also recognises a strictly-necessary exception where storage/access is essential to provide the online service the user requests and gives recording user information/selections as an example.

Working product position:

- diary, recipes, preferences and other core local storage are designed to provide the requested local food-tracking service;
- the app does not currently use advertising or third-party analytics storage;
- the product must still provide clear information about storage technologies, purpose, third parties and duration where required, even when an exception applies.

The public privacy/storage notice must remain aligned with the real shipped storage/network inventory.

ICO reference: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/

## 5. Necessity and proportionality

Existing design choices that reduce privacy risk:

- no account or identity requirement;
- no cloud food diary;
- local processing for nutrition calculations and personal memory;
- no advertising trackers or third-party analytics;
- no in-app remote speech recognition;
- network lookup only when the user requests packaged-product search/barcode functionality;
- local beta metrics exclude food names/diary contents;
- adult-beta gate;
- explicit delete-all-local-data control;
- encrypted and plain local backup/export options;
- evidence and recommendation are kept conceptually separate.

Open proportionality questions:

- whether weight/activity features are necessary for the product's initial beta objective or should be separately opt-in;
- whether every durable local key has an appropriate retention rule beyond user deletion/export;
- whether voluntary beta exports need a fixed operator-side deletion schedule and participant identifier scheme;
- whether external product images should be proxied/removed later if privacy or reliability evidence warrants it.

## 6. Risk register

Scales below are qualitative working judgements and require reviewer approval.

| Risk | Initial likelihood / severity | Existing controls | Further action | Residual status |
| --- | --- | --- | --- | --- |
| Device loss/browser clearing destroys diary | Medium / Medium | complete backup, encrypted backup option, local-first disclosure | beta-test restore across devices; improve backup habit prompts only if evidence supports | Open operational |
| Restore failure corrupts/mixes stores | Low / High | validate, stage, verify, rollback; v47 explicit quota and partial-rollback diagnostics | continue injected-failure regression | Low, monitored |
| User believes no data ever leaves device | Medium / Medium | network inventory, JIT OFF disclosure, privacy notice, browser speech disabled | keep docs/runtime in sync | Low if maintained |
| Packaged-food query exposes sensitive context to third party | Low-Medium / Medium | user-triggered only, notice before first remote lookup, no diary upload | assess whether query terms could reveal condition data; minimise query content | Open |
| Local health-adjacent information accessed by another person using device | Medium / Medium | device/browser security outside app; encrypted export available | consider optional local app lock only if users request it; do not add costly auth prematurely | Accepted/monitor |
| Misleading nutrition precision causes poor decisions | Medium / Medium | evidence badges, missing-as-null, estimate provenance, non-medical purpose | qualified nutrition review and source mapping | External blocker |
| Child/teen uses calorie/weight functionality | Medium / High | current 18+ beta gate and terms | complete likely-to-access assessment before broader launch; decide age strategy | External blocker |
| Voluntary beta export becomes centrally retained personal/health data | Medium / Medium-High | export is explicit; no silent endpoint | define intake, access, retention/deletion, pseudonymisation and secure storage process before collecting at scale | Open before 30-50 beta |
| Future cloud/AI feature silently expands processing | Low today / High potential | no-recurring-cost rule, due-diligence register, explicit architecture decisions | mandatory privacy/DPIA update before cloud diary, photo AI, LLM or accounts | Governance control |

## 7. Children's Code screen

Current product decision: **adult beta, 18+**.

This is a product boundary, not proof that the Children's Code can be ignored. ICO guidance says the Code applies to information-society services likely to be accessed by children and is not limited to services designed for them.

Before broader public launch, document:

- intended audience and marketing channels;
- evidence about likely child access;
- whether the age gate provides a proportionate level of assurance for the risk;
- whether calorie/weight features increase foreseeable child harm;
- whether a child-accessible mode should be excluded rather than redesigned at this stage.

Reference: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/

## 8. Automated decision-making

Current Smart Portion and related tools provide wellness-oriented estimates based on user-confirmed targets and food data. They do not make decisions with legal or similarly significant effects and do not control access to services or benefits.

Any future disease-risk score, medication/insulin calculation, clinical treatment recommendation, eligibility decision or clinician-facing decision support requires a fresh privacy and medical-device review before implementation.

## 9. Retention and deletion draft

### On device

User-controlled until browser/app data are cleared, the user deletes all Okello Food data, or a restore replaces local state. Backup files persist wherever the user saves them and are under the user's control.

### Operator-held beta evidence

**Policy must be chosen before collection at 30–50-user scale.** Proposed minimum:

- pseudonymous participant ID rather than full name inside evidence files where practical;
- separate recruitment/contact list from product evidence;
- restricted access;
- defined deletion date after the 90-day beta plus a short analysis window;
- delete raw exports after aggregate findings are finalised unless continued retention is specifically justified and disclosed.

Exact periods require founder decision and must be reflected in the privacy notice before collection.

## 10. Consultation and sign-off still required

| Decision | Status |
| --- | --- |
| Legal operator identity and privacy contact | TBD |
| Controller analysis for device-local designed processing | TBD |
| Article 6 lawful basis by purpose | TBD |
| Article 9 condition for any special-category processing | TBD |
| Operator-side beta export retention period | TBD |
| Children's Code / likely-access conclusion | TBD |
| Need for external privacy/legal review | Recommended if available |
| ICO fee self-assessment | Separate open gate |

## 11. DPIA conclusion

**Not signed off.** The architecture has strong data-minimisation characteristics, but the health-adjacent nature of weight/activity/eating patterns and the planned larger beta justify completing this DPIA rather than relying on the absence of a backend as a shortcut.

If final assessment identifies a high residual risk that cannot be reduced, the ICO's current guidance says prior consultation is required. That determination has not been reached here.
