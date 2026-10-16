# v50 — reflection

Build id: `v50-static-20261016-reflection-1`
Tests: 38 passing, all in CI

## What changed

One new module, `reflection-v50.js`, and a card at the top of the History
tab headed "What your log says". Nothing else in the product changed.

## Why

Through v49 the app answered "what did I eat" well and "so what" not at
all. Personal memory knew that banku was logged five times this week and
that the usual okro portion runs larger on a Sunday. It never said so.
The History tab showed daily totals, which every tracker shows, and the
Smart tab's insight block compared averages against a target, which every
tracker also does and which is empty in tracking-only mode.

The reflection card says things only this app can know, because only this
app records them.

## What it says

Computed from the last 14 days of `state.logs`, nothing else:

- The foods logged on the most days, counted by days not by calories.
- What usually sits on the plate with the main item, from `plateId`.
- Which meal slot carries most of the logged calories, and which slot
  appears on fewer than half the days. Stated as a count ("Lunch appears
  on 4 of 14 days"), never as "skipped": the log cannot tell an unlogged
  meal from an uneaten one.
- Whether the most-repeated food's portion differs between weekdays and
  weekends, with the two medians. Only when both sides have at least two
  logs and the gap is 15% or more.
- What share of the fortnight's calories was weighed, came from the
  person's own piece weights, came from standard piece sizes, or was a
  rough estimate. This is `amountQuality` and `estimateSource` read back
  to the person for the first time.
- What share of calories has a known salt value. Unknown is named as
  unknown, never summed as zero.

Every sentence carries an evidence line. Below three logged days the card
says how many days are logged and nothing else. Below the per-observation
thresholds a sentence is omitted rather than hedged.

## What it does not do

It does not read targets, defaults, or profile fields. It does not use the
words "should", "aim", "too much" or "cut down"; the test asserts their
absence from the source. It describes foods and patterns, never the
person. Principle 8 (wellbeing, not guilt) and the three-questions rule
(habit is never recommendation) both hold: the one forward-looking line,
suggesting weighing a piece of meat to replace standard piece sizes with
the person's own, is about the measurement, not the diet, and only
appears when standard sizes account for 30% or more of logged calories
and no personal piece weight exists.

## Engineering

- `reflection-v50.js` loads after `personal-food-memory-v1.js` and
  `day-forecast-v1.js`, before `trust-v46.js`. Read-only against the state
  repository; re-renders on `okello:state-written` and on the History tab
  click.
- `reflection-v50.test.js` runs the module under the node browser shim
  against a synthetic fortnight and asserts each observation, the
  threshold silence, the language contract, and that targets are never
  read. The shim gained `window.addEventListener` and element insertion
  stubs for it.
- Bundle bumped to v50 across bootstrap, service worker, update module,
  `index.html`/`app-v50.html`, manifest and recovery page.

## Still open

The card has something to say only after three logged days and gets
useful at about ten. That cannot be built; it has to be logged.
