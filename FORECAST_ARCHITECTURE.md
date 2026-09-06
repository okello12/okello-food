# Okello Food end-of-day forecast

## Question answered

The forecast answers a fourth question that is deliberately separate from nutrition content, calorie allowance and personal habit:

**Where is today heading if the rest of the day looks broadly like the user's recent pattern?**

It is a projection, not advice. It never changes the calorie target, banks calories, increases an allowance or tells the user to eat up to the projected number.

## Method

`day-forecast-v1.js` reads the existing tracker history only. It creates no new personal-data store.

For the current clock time it looks back over the previous 45 days and, on sufficiently populated logged days, calculates how many calories were logged after the same time of day. Entry timestamps are used when they genuinely belong to that historical day. Older or migrated entries with unusable timestamps fall back to conservative meal-time anchors.

The centre forecast is:

`calories logged today + median historical calories remaining after this time`

Median is used rather than mean so one unusual late meal does not dominate the projection.

When there are at least five comparable historical days, the interface also shows the 25th to 75th percentile projected finish as a recent middle range. This keeps the display from implying false precision.

## Confidence

- 3 to 4 comparable days: Emerging habit
- 5 to 9 comparable days: Learned habit
- 10 or more comparable days: Strong habit signal

With fewer than three comparable days, the app uses a clearly labelled fallback based on the existing meal-share pattern and observed meal frequency where available.

The forecast does not show a numerical projection until something has been logged today.

## Historical-day filter

Very sparse historical days can make a forecast look artificially low. The forecast therefore ignores days with no entries and days whose total logged calories are below the lower of 800 kcal or 35% of the current calorie target.

This is only a completeness heuristic. A future weighed-versus-estimated entry flag can improve forecast confidence further by distinguishing a well-measured history from a heavily guessed one.

## Placement

The card sits near the top of Today, after the calorie progress bar and before the broader weekly view.

It reports:

- calories logged so far;
- usual calories remaining after the current time;
- projected end-of-day calories;
- recent middle range when history is sufficient;
- neutral distance from the user's existing target;
- confidence and number of comparable days.

## Guardrails

The forecast must remain descriptive. In particular:

- no calorie banking;
- no instruction to compensate for a projected high day by restricting later;
- no instruction to spend a projected low day by eating more;
- no automatic target changes;
- no training of Personal Food Memory from forecast values.

Actual logged intake always remains separate from projected intake.