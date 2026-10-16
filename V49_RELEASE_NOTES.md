# v49 — repository writes and salt

Build id: `v49-static-20261016-repository-salt-1`
Tests: 37 passing, all in CI

## DD-F11 closed: app.js writes through the repository

`saveState()` now calls `OkelloStateRepository.mutate()` with a named
source (`app.addToToday`, `app.saveTargets`, etc). The mutator copies only
the fields app.js owns onto the live draft, so a stale in-memory copy can
no longer overwrite something another module wrote in between. On
rejection the in-memory state is reloaded from the durable copy and the
person is told; no writer renders a success path on a failed save.

Before this, app.js's writes were revisioned only because
state-repository-v46 patches `Storage.prototype.setItem`. That patch stays
as a safety net for third-party writers, but no first-party module relies
on it now.

`app-repository-writes-v49.test.js` proves the stale-copy case: app.js
saves targets from an old snapshot and a `pieceCalibration` field it never
saw survives.

## DD-F08 partially closed: salt on the Today screen

A fourth card. Sums only entries with a known salt value and states the
share of today's calories that covers. Unknown shows as a dash, never
"0 g". The catalogue carries no salt values yet, so for most people this
will read as unknown until the licensed-source review (DD-F04) populates
them; packaged foods from Open Food Facts and user-entered labels show
immediately.

No migration. Entries have carried a nullable `salt` since v46.
