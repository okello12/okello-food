(() => {
  'use strict';

  const contract=window.OkelloMealDataContract;
  if(!contract)return;

  const VERSION=1;
  const resolveFoodId=id=>contract.resolveFoodId?.(id)||String(id??'');

  function pieceRows(state,foodId,meal=null){
    const id=resolveFoodId(foodId);
    const out=[];
    for(const [day,entries] of Object.entries(state?.logs||{})){
      for(const entry of Array.isArray(entries)?entries:[]){
        if(resolveFoodId(entry?.foodId)!==id)continue;
        if(entry?.enteredUnit!=='pieces')continue;
        const count=Number(entry?.pieceCount ?? entry?.enteredAmount);
        const pieceKey=String(entry?.pieceKey||'');
        if(!(count>0)||!pieceKey)continue;
        if(meal&&String(entry?.meal||'')!==String(meal))continue;
        out.push({
          foodId:id,
          pieceCount:count,
          pieceKey,
          meal:entry?.meal||null,
          ts:Number(entry?.ts)||0,
          day
        });
      }
    }
    return out.sort((a,b)=>a.ts-b.ts);
  }

  function choosePieceKey(rows){
    const byKey=new Map();
    for(const row of rows){
      const key=row.pieceKey;
      const bucket=byKey.get(key)||{pieceKey:key,count:0,lastSeen:0};
      bucket.count++;
      bucket.lastSeen=Math.max(bucket.lastSeen,row.ts||0);
      byKey.set(key,bucket);
    }
    return [...byKey.values()]
      .filter(x=>x.count>=3)
      .sort((a,b)=>b.count-a.count||b.lastSeen-a.lastSeen||a.pieceKey.localeCompare(b.pieceKey))[0]?.pieceKey||null;
  }

  function usualDiscreteCount(rows){
    const stats=new Map();
    for(const row of rows){
      const key=String(row.pieceCount);
      const bucket=stats.get(key)||{value:row.pieceCount,count:0,lastSeen:0};
      bucket.count++;
      bucket.lastSeen=Math.max(bucket.lastSeen,row.ts||0);
      stats.set(key,bucket);
    }
    return [...stats.values()]
      .sort((a,b)=>b.count-a.count||b.lastSeen-a.lastSeen||a.value-b.value)[0]?.value??null;
  }

  function deriveScope(state,foodId,meal){
    const mealRows=meal?pieceRows(state,foodId,meal):[];
    const mealKey=choosePieceKey(mealRows);
    if(mealKey){
      return {scope:'meal',rows:mealRows.filter(x=>x.pieceKey===mealKey),pieceKey:mealKey};
    }

    const allRows=pieceRows(state,foodId);
    const allKey=choosePieceKey(allRows);
    if(allKey){
      return {scope:'overall',rows:allRows.filter(x=>x.pieceKey===allKey),pieceKey:allKey};
    }
    return null;
  }

  function usualPiecePortion(state,foodId,meal=null){
    const id=resolveFoodId(foodId);
    const scope=deriveScope(state,id,meal);
    if(!scope)return null;
    const pieceCount=usualDiscreteCount(scope.rows);
    if(!(Number(pieceCount)>0))return null;
    return {
      foodId:id,
      pieceKey:scope.pieceKey,
      pieceCount:Number(pieceCount),
      learningCount:scope.rows.length,
      scope:scope.scope,
      meal:scope.scope==='meal'?String(meal||''):null,
      lastSeen:Math.max(...scope.rows.map(x=>x.ts||0),0)
    };
  }

  window.OkelloPieceUsual=Object.freeze({
    version:VERSION,
    pieceRows,
    usualPiecePortion
  });
})();
