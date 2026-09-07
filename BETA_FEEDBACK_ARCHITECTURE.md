# Beta feedback architecture

## Purpose

v43 adds contextual beta feedback before adding new intelligence layers. The objective is evidence collection, not telemetry.

The feedback system is deliberately local-first. It does not submit data to a server and it does not introduce an account, API key or analytics dependency.

## Storage boundary

Feedback is stored separately from the food diary at:

`okello_beta_feedback_v1`

The main food store remains `okello_food_tracker_v3` and is not migrated for v43.

The separation is intentional. Beta research evidence is not part of the nutrition history and must not gain authority over food, portion or learning state.

Up to 500 feedback records are retained locally. The oldest records are dropped only when that bounded research store is exceeded.

## Evidence captured

Each feedback record contains:

- record id and timestamp;
- product surface;
- verdict: `right` or `issue`;
- optional issue classification and tester note;
- a bounded contextual snapshot of the result being judged;
- current app bundle version and active tab.

Context is captured at the time the tester answers. The system does not copy the whole food diary.

Current v43 surfaces are:

- Smart Meal;
- Quick Log with words;
- barcode lookup;
- food search/recovery.

Smart Meal feedback includes the governed runtime trace when one is available. This means a report can preserve the calorie budget, candidate shape and commit/review context that produced the visible result without reconstructing it later from memory.

## Issue taxonomy

The first beta taxonomy is intentionally small:

- wrong food or match;
- wrong amount or portion;
- missing component;
- misleading or unhelpful guidance;
- barcode/product mismatch;
- other.

The tester can add a short free-text correction, but a note is not mandatory.

## No server by design

v43 must not call `fetch`, `XMLHttpRequest`, `sendBeacon` or any equivalent submission mechanism from the feedback module.

Feedback remains on the device until the tester explicitly exports it as JSON or CSV.

This preserves the product's zero-variable-cost principle and avoids introducing a research backend before the beta has shown that one is necessary.

## Export and deletion

Settings exposes:

- Export JSON, for complete structured evidence;
- Export CSV, for review and analysis;
- Clear beta feedback, guarded by explicit confirmation.

The feedback export is separate from the normal food backup in v43. This avoids silently moving or duplicating research evidence during ordinary diary restore. If later beta operations require feedback to survive device migration, that relationship must be added explicitly rather than inferred.

## Evidence hierarchy

Feedback is evidence about the product, not evidence about the user's normal portion behaviour.

A correction submitted through beta feedback must never directly update food identity, portion memory, calibration, Smart Meal rules or canonical catalogue data.

The correct path is:

1. collect repeated failures;
2. review them;
3. decide whether a product/data change is justified;
4. implement that change through the normal governed contracts and tests.

This keeps the existing rule intact: what the person directly enters as food behaviour can be learnable; what a research system infers from a complaint is not automatically food truth.
