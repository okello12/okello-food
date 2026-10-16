# Shipped v45 fixtures

These are byte-exact copies of modules from production commit
8e6765ffd355f210fc8369756a5b5ebbdc00f0d6 (v45). They are not loaded
by the app. They exist so `v45-countunit-backup-upgrade.test.js` can
execute the real v45 writer and backup owner, then pass the output
through the v46 migration, proving the upgrade path on shipped code
rather than on a hand-written fixture.

The test pins each file's git blob SHA. Do not edit these files.
If a future migration needs a newer shipped generation as its input,
add a new directory rather than replacing this one.
