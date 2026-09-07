# Smart Meal fit and commit contract

The Smart Meal Composer must never manufacture a token-sized multi-component meal merely to satisfy a continuous calorie budget.

## Serving-range invariant

A suggested component may not fall below that food's declared `min` amount or above its `max`. The bounds define a sensible real serving. They are not advisory values that a later scaling pass may discard.

For a candidate meal:

1. Allocate the planning budget across components.
2. Convert those allocations to grams.
3. Clamp each component to its sensible `min`/`max` range and the normal 5 g display step.
4. If the result is over budget, one proportional scaling pass may be attempted.
5. Reapply every component's bounds after scaling.
6. Never apply a generic token floor such as `Math.max(5, ...)`.

The old 5 g fallback is prohibited. A 5 g piece of goat or a 10 g serving of fufu is not a meal suggestion.

## Full, reduced, then honest minimum

A continuous calorie target is planning information, not a reason to lie about food size. Selection therefore has three outcomes, in this order:

1. **Full**: return the complete meal when all components remain sensible and the meal fits the planning budget.
2. **Reduced**: if the full meal cannot fit, try a smaller component set while preserving sensible portions. Prefer a useful base/protein combination over a token three-part plate.
3. **Minimum over budget**: if no two-or-more component version can fit, return the full minimum-viable meal and state its actual calories and the exact amount by which it exceeds the planning budget.

This avoids a magic tolerance. A banku, tilapia and okro lunch whose minimum viable full plate is about 700 kcal against a 690 kcal lunch budget does not become 160 g / 160 g / 260 g. The composer can offer a genuine banku + tilapia version that fits. If even a reduced plate cannot fit, the interface says, for example, "Smallest sensible version is about 613 kcal, 586 kcal over this meal budget."

The meal shares remain planning defaults: Lunch 30%, Dinner 45%, Snack 15%. They do not override serving reality. Reduced-component fallback handles ordinary lunches that sit close to a three-component floor without silently changing the user's day target.

## Piece review and write ownership

A suggested gram amount is not automatically an observed gram amount. Before a multi-item Smart Meal, Ghanaian Plate or natural-language multi-item log is committed, every piece-native component is reviewed through the piece sheet. The person observes the count/size; the estimator converts it to grams and snapshots provenance.

The governed runtime writes the whole reviewed meal atomically with one `plateId`. Piece logs use `OkelloPieceEntry.createLogDraft`, so `grams`, `estimatedGrams`, `pieceCount`, `pieceKey`, estimate basis/source and nutrition snapshots stay coherent.

## App state synchronization boundary

`app.js` owns a long-lived in-memory `state` as well as the durable `okello_food_tracker_v3` store. A new runtime must not treat localStorage as the only state owner. If it writes a new meal to localStorage while the app closure still holds the older object, a later Quick Add, target save, recipe save or built-in export can operate on stale data and can overwrite or omit the newly added logs.

`app.js` therefore exposes `OkelloAppState.syncFromStorage()`. Immediately after the governed Smart Meal runtime commits its atomic log batch, it calls that hook before any visible refresh. The hook reloads durable state into the app closure and runs the app-owned render path. The commit trace records whether synchronization succeeded as `appStateSynchronized`.

The order is contractual:

1. write the complete reviewed meal to durable state;
2. synchronize the `app.js` closure from durable state;
3. refresh Smart Meal and observer-owned surfaces;
4. never allow a later app-owned save to reintroduce the pre-commit state.

This also keeps the built-in export path consistent with what is visibly logged.

## Legacy writer boundary

`smart-v3.js` still contains the older `logItems()` writer and three historical UI callers: Smart Meal Composer, natural-language Quick Log and the older Ghanaian Plate Builder. That writer also owns `location.reload()`.

The v42 integration does **not** remove that reload in place. A capture-phase boot guard blocks those three controls until the governed runtime is ready, then the governed runtime captures all three controls before their legacy handlers can run. This avoids changing a shared low-level side effect before its callers are fully enumerated.

The governed runtime itself does not reload after a write. After app-state synchronization it explicitly refreshes Today's calorie/protein/fibre totals, remaining gauges and log list. Updating `#todayLog` triggers the existing Day Forecast and feature observers. It also reuses the app's `mealSelect` change contract to refresh Quick Add Smart Portion and the food library, and emits `okello:food-log-changed` for future observers.

## Observability

The fit calculation returns a trace containing the incoming budget, minimum feasible calories, initial grams/calories, scaling factor and final clamped grams/calories. The runtime also keeps the latest render/selection/commit trace in `sessionStorage` under `okello_smart_meal_last_trace_v42` and exposes it through `OkelloSmartMealRuntime.lastTrace()`.

This is specifically to prevent post-reload diagnosis by inference. The next low-budget event should show what the engine saw before the write.

## Regression properties

Across tested budgets:

- every emitted component stays inside its declared `min`/`max` range;
- full and reduced suggestions stay within the planning budget;
- minimum-over-budget suggestions explicitly report `overByKcal` and never masquerade as fitting;
- piece-native components are reviewed before the atomic write;
- the governed runtime synchronizes the app-owned in-memory state immediately after its durable write;
- the governed runtime does not call `location.reload()`;
- the boot guard prevents the legacy thin-record writers from running before runtime ownership is established.

The 7 September 2026 regression case is `ghana_fufu + goat + light_soup` with a 27 kcal budget. The legacy implementation produced 10 g / 5 g / 10 g. The governed result is the real minimum meal, 180 g / 150 g / 250 g, reported honestly as over budget.
