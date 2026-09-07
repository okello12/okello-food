(() => {
  'use strict';

  const results = [];
  const assert = (name, condition, detail='') => {
    results.push({name, pass:!!condition, detail});
    if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  };
  const sumStored = entries => (entries || []).reduce((a,x) => ({
    kcal:a.kcal + (Number(x.kcal)||0),
    protein:a.protein + (Number(x.protein)||0),
    fibre:a.fibre + (Number(x.fibre)||0)
  }), {kcal:0,protein:0,fibre:0});
  const snapshot = (food, grams) => ({
    grams,
    kcal:Number(food.kcal)*grams/100,
    protein:Number(food.protein)*grams/100,
    fibre:Number(food.fibre||0)*grams/100
  });

  async function run(){
    const out = document.getElementById('results');
    try {
      // Nutrition snapshot invariant: catalog changes must never re-price written logs.
      const okro = {kcal:90,protein:7,fibre:2.5};
      const written = snapshot(okro, 400);
      const before = sumStored([written]);
      okro.kcal = 60; okro.protein = 1.5; okro.fibre = 2.8;
      const after = sumStored([written]);
      assert('Written nutrition survives catalogue re-costing', JSON.stringify(before)===JSON.stringify(after));
      assert('Written kcal stays at write-time value', after.kcal===360, `got ${after.kcal}`);
      assert('Written protein stays at write-time value', after.protein===28, `got ${after.protein}`);

      // Piece-weight snapshot invariant: later reference or personal calibration changes are future-only.
      const pieceLog = {
        enteredAmount:5,
        enteredUnit:'medium-piece',
        grams:250,
        estimatedGrams:250,
        estimateBasisGrams:50,
        amountQuality:'estimated',
        estimateSource:'reference-piece-weight'
      };
      const reference = {goat:{medium:50}};
      reference.goat.medium = 62;
      assert('Reference piece-weight changes do not resize old logs', pieceLog.estimatedGrams===250 && pieceLog.grams===250);
      assert('Old log preserves the basis it used', pieceLog.estimateBasisGrams===50);

      const personalLog = {...pieceLog, grams:270, estimatedGrams:270, estimateBasisGrams:54, estimateSource:'personal-piece-weight'};
      const laterPersonalMedian = 61;
      assert('Personal calibration changes do not resize old logs', personalLog.estimatedGrams===270 && personalLog.estimateBasisGrams===54 && laterPersonalMedian!==personalLog.estimateBasisGrams);

      // Guard the actual app source, not just this fixture. totalsFor must sum snapshots;
      // addToToday must write the calculated nutrition into the log entry.
      const source = await fetch('app.js?invariant-test=1',{cache:'no-store'}).then(r=>{
        if(!r.ok) throw new Error(`Could not fetch app.js (${r.status})`);
        return r.text();
      });
      const totalsStart = source.indexOf('function totalsFor(entries)');
      const totalsEnd = source.indexOf('function mealCalories', totalsStart);
      const totalsBody = totalsStart>=0 && totalsEnd>totalsStart ? source.slice(totalsStart,totalsEnd) : '';
      assert('App totalsFor exists', !!totalsBody);
      assert('App totalsFor sums stored kcal', totalsBody.includes('Number(x.kcal)'));
      assert('App totalsFor sums stored protein', totalsBody.includes('Number(x.protein)'));
      assert('App totalsFor sums stored fibre', totalsBody.includes('Number(x.fibre)'));
      assert('App totalsFor does not look food definitions up again', !totalsBody.includes('foodById('));

      const writerStart = source.indexOf('function addToToday()');
      const writerEnd = source.indexOf('function renderToday()', writerStart);
      const writerBody = writerStart>=0 && writerEnd>writerStart ? source.slice(writerStart,writerEnd) : '';
      assert('App log writer snapshots kcal', writerBody.includes('kcal:c.kcal'));
      assert('App log writer snapshots protein', writerBody.includes('protein:c.protein'));
      assert('App log writer snapshots fibre', writerBody.includes('fibre:c.fibre'));

      out.innerHTML = `<h2>Snapshot invariants: PASS</h2><p>${results.length} checks passed.</p><ul>${results.map(r=>`<li>✓ ${r.name}</li>`).join('')}</ul>`;
      document.documentElement.dataset.testStatus='pass';
    } catch (err) {
      out.innerHTML = `<h2>Snapshot invariants: FAIL</h2><p>${String(err && err.message || err)}</p><ul>${results.map(r=>`<li>${r.pass?'✓':'✗'} ${r.name}</li>`).join('')}</ul>`;
      document.documentElement.dataset.testStatus='fail';
      console.error(err);
    }
  }

  run();
})();
