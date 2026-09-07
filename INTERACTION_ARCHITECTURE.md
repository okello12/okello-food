# Interaction Architecture

Okello Food has a few deliberately centralised interaction owners. This note exists so future features do not accidentally add competing capture-phase handlers or recreate controls that another module owns.

## Capture-phase ownership

### `backup-v2.js`

Owns backup export/import at runtime.

- Captures clicks on `#exportBtn` and `#encryptedExportBtn`.
- Uses `preventDefault()` and `stopImmediatePropagation()` before dispatching the complete backup implementation.
- Captures changes on `#importInput` and `#encryptedImportInput` and stops later legacy handlers.
- This is intentional because older incomplete backup handlers still physically exist in `app.js` / `features-v1.js`.

Any future code that needs those controls must extend `backup-v2.js` or replace the legacy handlers cleanly. Do not add another independent capture interceptor for the same selectors.

### `scanner-launch-v1.js`

Owns scanner launch surfaces, not barcode decoding.

On non-iPhone browsers:

- One document-level capture click listener handles `#hubScanBtn` and `#scanBarcodeBtn`.
- It uses `preventDefault()` and `stopImmediatePropagation()` before calling `OkelloScanner.open()`.
- Delegation means replacement button elements inherit launch behaviour without rebinding.

On iPhone:

- There is no delegated click interceptor for scanner launch.
- A genuine `input[type=file][capture=environment]` is overlaid on each launch button so the camera opens from a real user gesture.
- A targeted `MutationObserver` watches only for scanner-related controls being added and repairs the native capture surface.
- Repairs are coalesced through `requestAnimationFrame` and are idempotent.

### `interaction-v1.js`

Provides the iOS standalone touch fallback.

- It runs only in iPhone standalone mode.
- It listens in capture phase for touch gestures and converts eligible taps to `.click()`.
- Scanner-owned controls are deliberately excluded so it does not compete with the native scanner capture path.
- It does not own backup semantics and should not be expanded into a general event router.

## Scanner ownership boundary

`scanner-launch-v1.js` answers: **Can the user launch scanning reliably?**

`scanner.js` answers: **Can the image/camera input be decoded into a barcode?**

Keep those failure modes separate.

The local `#scanBarcodeBtn` may be recreated by `scanner-launch-v1.js` because that button belongs to the scanner surface around `#lookupBarcodeBtn`.

The global `#hubScanBtn` is different. Its markup is owned by `ux-v2.js`, so `scanner-launch-v1.js` repairs its iPhone capture overlay if the button reappears but does not recreate the hub button itself. If hub ownership ever moves, change that contract explicitly rather than silently making both modules create the same control.

## Post-scan product contract

A successful scan should preserve three separate questions:

1. **What does this product contain?** Use the packet / barcode source and retain source uncertainty.
2. **What amount fits the current target?** Use Smart Portion separately.
3. **What amount does this person normally eat?** Use Personal Food Memory only after enough real logs exist.

For a newly scanned packaged product, there is no personal usual amount yet. The preferred initial amount is:

- Open Food Facts `serving_quantity` when it is a valid positive value, labelled clearly as the **pack serving**;
- otherwise 100 g as a neutral fallback.

Personal Food Memory remains blank until its normal learning threshold is met. It must not infer a personal usual amount from a manufacturer serving suggestion.

## Plate Builder piece-entry hierarchy

Piece entry is a dining-table interaction. It must be usable one-handed and must keep the shortest path to logging unobstructed.

The primary sheet may contain count, piece size, a grams alternative, the current actionable nutrition estimate and a Smart Portion suggestion. Those controls support the immediate decision and may update live.

The confirm action remains the visual and interaction priority. Nothing optional may be inserted between a valid amount selection and the ability to confirm it.

### What the sheet opens showing

Personal Food Memory and Smart Portion answer different questions and must not silently overwrite one another.

When a reliable usual piece amount exists, the sheet opens on the **personal usual**. Example: if the person's learned usual is 4 medium goat pieces and Smart Portion currently recommends 3, the active count opens at 4.

The Smart Portion suggestion remains visible as a secondary, tappable recommendation. Tapping it explicitly replaces the active count/size with the recommended piece amount.

Smart Portion must never silently become the opening count merely because it is available. It is a recommendation, not a reconstruction of what the person normally eats.

When no learned piece usual exists, a piece-native food opens at one piece using its preferred piece size. The Smart Portion recommendation can still be shown and applied with one tap.

### Piece-first defaults

Foods with natural piece models open directly in pieces. Goat, chicken, crab and fish should not require the person to discover a separate piece mode.

The preferred piece size is selected automatically. For small/medium/large foods, medium is the normal default. Count uses a direct stepper rather than requiring numeric-keyboard entry.

Gram-native foods such as banku remain gram-native.

### Switching from pieces to grams

Switching units is a change in the active amount representation, not merely a visual reformat.

If the current piece entry is 3 medium pieces resolving to 168 g, switching to grams prefills **168 g**.

The active persisted provenance then becomes a plain gram entry:

- piece count and `pieceKey` are cleared from the active amount;
- `estimatedGrams` and piece-weight source are not persisted on the gram entry;
- the prefilled gram amount is `estimated` unless the person explicitly says it was weighed.

The sheet may keep the previous piece draft transiently so switching back during the same open interaction restores the earlier count and size. That transient state must not leak into the final log if the person confirms in grams.

This prevents a gram log from pretending the person logged pieces when they did not.

### Smart Portion target visibility

The Smart Portion continuous target is secondary context, not another amount the user must reconcile before logging.

When the actionable piece amount differs from `targetGrams`, the target should remain visible in secondary text. This makes the rounding gap visible rather than silently truncating the allowance.

For example, if a 187 g target becomes 3 medium pieces at 168 g, the sheet may show the 168 g actionable amount with the 187 g target underneath. The person can see that the recommendation leaves 19 g of the continuous allowance unused.

The UI must not use `targetGrams` as the nutrition basis for the active piece amount.

### Live nutrition placement

The nutrition readout must update on every count or size change without moving the controls under the person's thumb.

Markup/CSS therefore must reserve a fixed nutrition region before values are rendered. Calorie, protein and other numeric values should use tabular figures and stable-width containers so changing from 1 piece to 12 pieces does not cause layout shift.

The confirm button, count stepper and size controls must not move vertically or horizontally as live nutrition values change.

This is an interaction invariant, not cosmetic polish: a one-handed control that shifts while being tapped is a functional defect.

### Calibration prompt placement

Piece calibration is evidence collection for future estimates, not a prerequisite for the current meal.

The preferred behaviour is to offer calibration **after the log has been written**. For example: “Want to improve future estimates? Weigh one medium piece.” Recording that observation must not edit or resize the meal that was just logged.

If a calibration invitation is ever shown on the amount sheet itself, it must be a quiet secondary line below the confirm action. It must never become a modal, required field, blocking step or inline panel that competes with count, size and confirm controls.

This ordering protects the primary dining-table job: open sheet, adjust amount if necessary, confirm food. Calibration remains optional follow-up work.

## Rule for future capture handlers

Before adding a document-level capture listener that calls `stopImmediatePropagation()`:

1. Check this file for an existing owner.
2. Prefer delegated ownership inside the existing module when selectors overlap.
3. Document the selector, event type, platform scope and reason for propagation blocking here.
4. Avoid two modules claiming the same control unless one explicitly delegates to the other.

This prevents silent interaction ownership from becoming an invisible dependency graph.
