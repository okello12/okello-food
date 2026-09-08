# ICO data protection fee assessment inputs

Status: **not completed**. This document prepares the facts and unresolved questions needed to run the ICO's live self-assessment. It must not be used to claim that Okello Food is exempt or registered.

Live ICO tool: https://ico.org.uk/fee-checker

Checked 8 September 2026. The ICO says organisations, including sole traders, that use personal information may need to pay unless an exemption applies. It also states that companies that have not started trading do not need to pay a fee yet and should retake the assessment once trading starts. The answer depends on the actual operator and processing, not merely on the existence of an app.

## Facts already supported by the product

- Okello Food is currently an adult beta PWA.
- There are no app accounts or central cloud diaries.
- The main food diary, recipes, targets, weight/activity records, preferences, feedback and local beta metrics are stored in browser storage on the user's device.
- User-triggered packaged-food searches/barcodes send a query/barcode and normal web-request information to Open Food Facts.
- Browser speech recognition is disabled in the app.
- There is no advertising tracker or third-party analytics endpoint in the current product.
- Manual beta evidence exports may be shared with the founder/test team if a participant chooses to send them. Once the operator receives such an export, that copy is no longer merely device-local and must be included in the operator's data-protection assessment.

## Founder/operator facts required before running the tool

Record these answers contemporaneously with the ICO assessment:

| Question | Answer |
| --- | --- |
| Legal operator: individual/sole trader/company/other | **TBD** |
| Legal/trading name | **TBD** |
| Company number if applicable | **TBD** |
| Has the operator started trading? If yes, date | **TBD** |
| Is any money currently received for Okello Food or related services? | **TBD** |
| Does the operator determine the purposes/means of any personal-data processing connected to the service? | **TBD / privacy assessment** |
| Does the operator receive identifiable beta exports, support messages or other user data? | **TBD operational process** |
| Are all purposes within a fee exemption, or is information used for product/service provision beyond the exempt categories? | **TBD via live ICO assessment** |
| Average staff count for the relevant financial year | **TBD** |
| Annual turnover for the relevant financial year | **TBD** |
| Charity/public authority/small occupational pension scheme status | **TBD / likely not applicable but must be confirmed** |
| CCTV used by the operating business for crime-prevention purposes | **TBD** |

## Current fee bands for planning only

At the time checked, ICO guidance lists:

- Tier 1: £52 before the £5 direct-debit discount, generally for micro organisations meeting the stated staff/turnover thresholds;
- Tier 2: £78;
- Tier 3: £3,763.

These figures are regulator-controlled and may change. Re-check the live ICO tool when completing the assessment.

## Required evidence to close DD-F06 fee sub-gate

Save:

1. assessment date;
2. the operator facts used;
3. the ICO outcome (fee due / no fee / no fee yet);
4. the rationale or result screen/reference;
5. if payable, registration/payment evidence;
6. a diary date to reassess if the result is conditional, especially if the business has not yet started trading.

## No premature conclusion

The repository intentionally does not answer the assessment on the founder's behalf. A device-local architecture materially reduces disclosure and central-retention risk, but it does not by itself prove a data-protection-fee exemption.
