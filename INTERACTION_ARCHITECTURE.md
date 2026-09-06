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

## Rule for future capture handlers

Before adding a document-level capture listener that calls `stopImmediatePropagation()`:

1. Check this file for an existing owner.
2. Prefer delegated ownership inside the existing module when selectors overlap.
3. Document the selector, event type, platform scope and reason for propagation blocking here.
4. Avoid two modules claiming the same control unless one explicitly delegates to the other.

This prevents silent interaction ownership from becoming an invisible dependency graph.
