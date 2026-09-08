# Okello Food 90-day beta evidence protocol

Status: predeclared product-evidence plan. This document does not claim that the participants or outcomes already exist.

## Objective

Test whether Okello Food is useful beyond a Ghanaian-only context while preserving the product's strongest differentiator: deeper treatment of foods, mixed dishes and household portions that mainstream trackers often flatten or miss.

The central question is:

> Can a person log what they genuinely ate today, without fighting the app, regardless of where that food comes from?

Ghanaian and West African coverage is the deepest current cultural library. It is a beachhead and evidence source, not a restriction on who the product is for.

## Recruitment

Target 30–50 adult beta users. Friends and family may participate, but they must not dominate the evidence set.

Recruit across at least five materially different food backgrounds, with no single background forming a majority. The intended recruitment pool should include meaningful representation from:

- West African
- Caribbean
- South Asian
- East or Southeast Asian
- North African or Middle Eastern
- UK or European
- Latin American
- mixed-cuisine households

The familiar-food setting is a discovery preference only. It is not ethnicity data, is not used to infer identity, and must not become a nutrition recommendation.

## Product promises to test

1. A new adult can make a first useful log in under one minute without understanding the architecture.
2. A mixed meal can be logged as one meal without repeated navigation through unrelated tools.
3. Countable or household units are chosen when they match how the person naturally thinks about the food.
4. A missing food does not make the app unusable because packet labels, custom foods and the whole-pot calculator provide an escape route.
5. Estimates are visibly estimates and source uncertainty does not masquerade as precision.
6. The app remains useful for a person who never eats Ghanaian food.

## Predeclared measures

These are project decision thresholds, not claimed industry benchmarks.

| Measure | Evidence sought |
| --- | --- |
| First useful meal | Median under 60 seconds among observed/tested first-run sessions |
| Repeat use | A meaningful group still logs on multiple days at week 4 |
| Cultural breadth | Successful real meals from at least five food-background groups |
| Household units | People naturally choose pieces/counts/household units where offered instead of converting everything to grams |
| Search failure | Repeated unresolved searches are identified and fall release to release |
| Corrections | Repeated food/amount corrections are measurable and fall release to release |
| Data integrity | Zero known unrecoverable diary-loss incidents |
| Backup | Successful restore on multiple iPhone and Android/browser combinations |
| Differentiation | Users spontaneously describe the app as understanding foods or portions that another tracker handles poorly |
| Willingness to pay | Behavioural evidence such as a real pre-order/payment test, not only a hypothetical survey answer |

## Evidence collection

The beta remains local-first.

- `okello_beta_metrics_v1` records local event types and timing, not food names or diary contents.
- `okello_beta_feedback_v1` stores structured feedback locally until the participant explicitly exports it.
- The familiar-food discovery setting may be included in a participant's exported beta evidence to compare usability across discovery cohorts.
- No cloud diary, account system or silent analytics endpoint is introduced by this protocol.

Participants should export the local beta metrics/feedback on agreed checkpoints. If manual exports become operationally unworkable at 30–50 users, a separate privacy/cost decision is required before introducing any optional server-side evidence endpoint.

## Checkpoints

### Day 0

Observe first use where possible. Record whether the person can log an actual meal and where they hesitate.

### Day 7

Collect local metrics/feedback export. Ask what foods or portions were hardest to represent. Do not coach them into praising cultural coverage.

### Day 28

Measure repeat use and collect the second export. Ask what made them return or stop.

### Day 60

Prioritise repeated failure patterns only. Do not add broad features because one tester requested them.

### Day 90

Make a continue/reposition/stop decision from the evidence set.

## Decision rule

Continue investing in the product thesis if users from multiple food backgrounds repeatedly return because Okello Food makes their real meals easier or more trustworthy to record than their alternatives.

Do not treat download count, sprint count, catalogue size or compliments as substitutes for repeat use.

If the product only retains the builder and a small Ghanaian friends-and-family circle, do not respond by adding expensive AI. Reassess the problem and positioning first.
