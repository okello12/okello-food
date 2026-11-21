# Commercial launch decisions — 21 November 2026

Goal: launch the smallest viable paid adult general-wellbeing product, not a 90-day development project. Run external workstreams in parallel. A public paid launch needs the following positive evidence; a limited controlled no-payment test is a distinct phase.

## Founder decisions confirmed 21 November 2026

UK sole trader; preferred name Bowlful (not a cleared trading name); £29 annual premium offer; Cloudflare Pages selected. UK adult initial market and fixed twelve-month non-renewing offer are proposed launch defaults, subject to final terms and checkout acceptance testing. No permission to disclose private home/contact details, submit statutory registrations, purchase a domain, or take payments is inferred from these decisions.

## Critical path

| Decision | Status | Closure |
|---|---|---|
| Hosting | Build package prepared; account connection and migration outstanding | GitHub Pages expressly disallows running an online business or commercial SaaS: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits. Use commercially suitable Cloudflare plan after terms/account check. Connect only this repo, select main, framework none, build command `node scripts/build-commercial-static.cjs`, output `dist`. Test preview before custom domain. See https://developers.cloudflare.com/pages/get-started/git-integration/. Do not redirect old origin until reachable testers confirm successful migration or no data to retain. |
| Brand | Bowlful not cleared | Third-party record reports UK figurative mark UK00003481962 class 43, and bowlful.net offers nutrition/macro tracking in food sector. Check official register https://www.gov.uk/search-for-trademark, related classes 9/42 and relevant classes/markets; assess passing-off and confusion. No definitive infringement conclusion. Keep Okello Food as internal working name until cleared. |
| Food provenance | 320 seed definitions inventoried, explicit source chains absent at row level | See `evidence/seed-source-gap-register.csv` and first priority candidates. Audit rights across current catalogue. For launch, retain only demonstrably independently created or commercially reusable records; conditionally exclude unresolved values from a commercial build rather than label them verified. Preserve a beta compatibility/recovery route and personal historical logs. Review independently and cite appropriately. No WAFCT commercial production reuse without permission. |
| Data protection | Drafts plus opt-in control prepared, sign-off pending | Controller/legal operator facts, privacy contact, ICO fee outcome, data flow and Article 6/9 conclusions, child-access risk, support/retention process. See current ICO storage exceptions https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/ and age-assurance guidance. Local processing not blanket exemption. |
| Payment and consumer terms | Not authorised to collect money yet | Sole trader and GBP 29 annual price selected; complete identity, tax, launch territory and processor details; clearly specify functionality, price, duration, cancellation, refund, support, compatibility and data export. See https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling. No actual payment links until terms and gates approved. |
| Real product use | Unknown | Observe five independent adults first; track success/failure on a real meal unprompted. Recruit 30–50 in parallel, collect opt-in metrics at week 1 and 4. Do not describe hypothetical responses as real observations. A limited paid founding offer can be tested once the actual selling gates pass, without waiting 90 days. |

## Commercial test (proposed, not established market price)

Start with UK adults in culturally mixed households, West African diaspora as initial acquisition channel, no medical claims. Test a capped founding 12-month licence at £29 against a £3.99/month equivalent subscription proposition in interviews. No auto-renewal by default in the first cohort; no lifetime promise. Use one clear real offer after terms and rights clearance; record actual conversion, ongoing support, refunds and repeat usage, not just interest. Core free logging should remain accessible without payment until the offer is implemented. Payment verification requires separately justified minimal entitlement infrastructure; a client-only switch is not robust paid access control. No hosted food diary needed. No payment processing implemented in this PR.

## Required founder inputs (not assumed)

Exact legal name and suitable business address for service, monitored privacy/support email; actual trading status/staff/turnover and existing data handling; confirm UK-only initial sales and budget; clear Bowlful and select domain; connect Cloudflare account and approve provider terms; approve final fixed-duration offer and terms before collecting money. See COMMERCIAL_OFFER_DRAFT.md. No private contact details should be added to the public repository without an explicit decision.

## Recruitment message for existing founder contacts (send only after privacy process is ready)

I'm preparing a new food-tracking app for commercial launch. It is designed around the meals people actually eat across different cultures, including balls, ladles, pieces and home-cooked recipes. I'm looking for adults to try it on a real meal and tell me where it falls short. It's for general wellbeing, not medical advice. Your diary stays on your device; feedback and optional research metrics are voluntary. Would you be willing to try it and give me honest feedback? No payment or commitment at this stage.

Ask first-time users to log yesterday's real meal without coaching; record time, success, missing food and unit, clarity of uncertainty and one thing they would change. Never request their full diary as research evidence. Keep recruitment contact list separate from pseudonymous feedback. Proposed delete raw feedback 30 days after the 90-day evidence window, subject to founder approval, disclose and apply. Do not collect medical or children's information. 
