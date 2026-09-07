# Smart Meal fit contract

The Smart Meal Composer must never manufacture a token-sized multi-component meal merely to satisfy a continuous calorie budget.

## Core invariant

A suggested component may not fall below that food's declared `min` amount. The `min`/`max` bounds define the sensible range for a real serving. They are not advisory values that may be discarded by a later scaling pass.

For each candidate meal:

1. Allocate the calorie budget across components.
2. Convert those allocations to grams.
3. Clamp each component to its sensible `min`/`max` range and round to the normal 5 g display step.
4. If the resulting meal is over budget, one proportional scaling pass is allowed.
5. After scaling, clamp every component to its sensible `min`/`max` range again.
6. If the clamped meal still exceeds the available budget, return **does not fit**. Do not scale again.

The old `Math.max(5, ...)` fallback is prohibited. A 5 g piece of goat or a 10 g serving of fufu is not a useful meal suggestion and must never be made to look legitimate by a generic floor.

## Understate rather than invent

When a discrete representation cannot hit a continuous target exactly, estimators default to the lower actionable amount rather than exceeding the allowance. That rule applies to piece conversion. It does not permit shrinking a full multi-component meal below sensible component minimums.

## Observability

The fit calculation returns a trace containing the incoming budget, the minimum feasible meal calories, the initially allocated grams/calories, the one scaling factor, and the final clamped grams/calories. This exists so a low-budget failure can be explained from source rather than inferred from a screenshot after a reload.

## Regression property

For every budget tested, either:

- the composer returns no candidate because the meal does not fit; or
- every returned component is at or above its food's `min`, at or below its `max`, and the total calories do not exceed the budget.

The 7 September 2026 regression case is `ghana_fufu + goat + light_soup` with a 27 kcal budget. The legacy implementation produced 10 g / 5 g / 10 g. The governed result is now **does not fit**.
