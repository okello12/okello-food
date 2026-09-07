(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const CONTRACT_VERSION=1;
  const VALID_BASIS=new Set(['base-only','includes-protein','unknown']);
  const STATIC_ALLOWED=new Set(['base-only','includes-protein']);
  const resolveFoodId=id=>window.OkelloStorageMigration?.resolveFoodId?.(id)||String(id??'');

  // Soup/stew entries are explicit here. A new static Soup id must be added to
  // this table or the contract test will fail. Complete meal is deliberately a
  // composite category and is always includes-protein for plate-builder purposes.
  const SOUP_BASIS=Object.freeze({
    okro:{basis:'includes-protein',baseFoodId:'okro_base'},
    light_soup:{basis:'includes-protein',baseFoodId:'light_soup_base'},
    beef_stew:{basis:'includes-protein',baseFoodId:'ghana_tomato_stew'},

    ghana_groundnut_soup:{basis:'includes-protein',baseFoodId:'ghana_groundnut_soup_base'},
    ghana_palmnut_soup:{basis:'includes-protein',baseFoodId:'ghana_palmnut_soup_base'},
    ghana_ebunuebunu:{basis:'includes-protein'},
    ghana_ayoyo_soup:{basis:'includes-protein'},
    ghana_okro_stew:{basis:'includes-protein',baseFoodId:'ghana_okro_stew_base'},
    ghana_kontomire_stew:{basis:'includes-protein',baseFoodId:'ghana_kontomire_stew_base'},
    ghana_garden_egg_stew:{basis:'includes-protein'},
    ghana_agushie_stew:{basis:'base-only'},
    ghana_tomato_stew:{basis:'base-only'},
    ghana_light_soup:{basis:'includes-protein',baseFoodId:'light_soup_base'},

    world_chicken_curry:{basis:'includes-protein'},
    world_lamb_curry:{basis:'includes-protein'},
    world_miso_soup:{basis:'includes-protein'},
    world_thai_green_curry:{basis:'includes-protein'},
    world_thai_red_curry:{basis:'includes-protein'},
    world_tom_yum:{basis:'includes-protein'},
    world_harira:{basis:'includes-protein'},
    world_egusi_soup:{basis:'includes-protein'},
    world_doro_wat:{basis:'includes-protein'}
  });

  const BASE_VARIANTS=Object.freeze([
    {id:'okro_base',name:'Okro soup base, no meat/fish',emoji:'🥘',cat:'Soup',basis:'base-only',kcal:60,protein:1.5,fibre:2.5,portion:300,min:220,max:450,note:'Base only: okro, tomato/onion, seasoning and cooking fat. Add meat/fish separately.'},
    {id:'light_soup_base',name:'Light soup base, no meat/fish',emoji:'🍲',cat:'Soup',basis:'base-only',kcal:30,protein:1.5,fibre:1,portion:350,min:250,max:450,note:'Base only. Add meat/fish separately.'},
    {id:'ghana_okro_stew_base',name:'Okro stew base, no meat/fish',emoji:'🥘',cat:'Soup',basis:'base-only',kcal:60,protein:1.5,fibre:2.8,portion:300,min:220,max:400,note:'Base only. Add goat, fish, crab or other proteins separately.'},
    {id:'ghana_groundnut_soup_base',name:'Groundnut soup base, no meat/fish',emoji:'🍲',cat:'Soup',basis:'base-only',kcal:110,protein:4,fibre:1.8,portion:350,min:250,max:450,note:'Base includes the real protein from groundnut paste; meat/fish are separate.'},
    {id:'ghana_palmnut_soup_base',name:'Palm nut soup base, no meat/fish',emoji:'🍲',cat:'Soup',basis:'base-only',kcal:95,protein:2,fibre:1.5,portion:350,min:250,max:450,note:'Base only. Palm concentrate remains calorie dense; add meat/fish separately.'},
    {id:'ghana_kontomire_stew_base',name:'Kontomire stew base, no meat/fish',emoji:'🥬',cat:'Soup',basis:'base-only',kcal:110,protein:3.5,fibre:3.5,portion:220,min:150,max:300,note:'Base only. Kontomire/agushie may contribute protein; add egg, fish or meat separately.'}
  ]);

  const EXTRA_PROTEINS=Object.freeze([
    {id:'ghana_beef_kidney',name:'Beef kidney, cooked',emoji:'🥩',cat:'Protein',kcal:158,protein:27,fibre:0,portion:120,min:80,max:180,note:'Practical estimate; cooked edible weight.',providesAnimalProtein:true},
    {id:'ghana_pork_feet',name:'Pork feet / trotters, cooked edible portion',emoji:'🍖',cat:'Protein',kcal:212,protein:23,fibre:0,portion:150,min:100,max:220,note:'Practical estimate; bone and fat content vary.',providesAnimalProtein:true},
    {id:'ghana_salted_beef',name:'Salted beef / salt beef, cooked',emoji:'🥩',cat:'Protein',kcal:250,protein:18,fibre:0,portion:120,min:80,max:180,note:'Practical estimate; cut and curing vary.',providesAnimalProtein:true},
    {id:'ghana_sea_bass',name:'Sea bass, cooked',emoji:'🐟',cat:'Protein',kcal:124,protein:24,fibre:0,portion:180,min:120,max:250,note:'Cooked edible weight.',providesAnimalProtein:true},
    {id:'ghana_pork',name:'Pork, cooked edible meat',emoji:'🍖',cat:'Protein',kcal:242,protein:27,fibre:0,portion:170,min:120,max:220,note:'Practical estimate; cut and fat level vary.',providesAnimalProtein:true}
  ]);

  // Frozen reference table. Personal calibration never mutates this table.
  const PIECE_WEIGHTS=Object.freeze({
    goat:Object.freeze({small:30,medium:50,large:80}),
    beef:Object.freeze({piece:40}),
    chicken:Object.freeze({small:35,medium:45,large:70}),
    ghana_chicken_thigh:Object.freeze({small:35,medium:45,large:70}),
    crab:Object.freeze({whole:60,half:25,claw:15}),
    mackerel:Object.freeze({half:90,whole:180})
  });

  // Built-in raw foods are private to app.js, so the contract facade adds these
  // flags when they are read. State-backed Protein foods are stamped below.
  const BUILTIN_ANIMAL_IDS=new Set([
    'egg','sardines','tuna','cottage','chicken','turkey','tilapia','salmon','mackerel','prawns','beef','goat','crab',
    'raw_chicken','raw_beef','raw_goat','raw_fish','raw_smoked_fish'
  ]);
  const PLANT_PROTEIN_EXCEPTIONS=new Set(['world_tofu_firm']);

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }
  function writeState(s){localStorage.setItem(STORE,JSON.stringify(s));}
  function ensureDurableState(s){
    s.customFoods=Array.isArray(s.customFoods)?s.customFoods:[];
    s.recipes=Array.isArray(s.recipes)?s.recipes:[];
    s.mealTemplates=Array.isArray(s.mealTemplates)?s.mealTemplates:[];
    s.definitionEvents=Array.isArray(s.definitionEvents)?s.definitionEvents:[];
    s.pieceCalibration=s.pieceCalibration&&typeof s.pieceCalibration==='object'?s.pieceCalibration:{};
    s.pieceCalibration.observations=Array.isArray(s.pieceCalibration.observations)?s.pieceCalibration.observations:[];
    return s;
  }
  function upsertLibraryFood(s,food){
    const i=s.customFoods.findIndex(x=>x&&String(x.id)===food.id);
    const next={...(i>=0?s.customFoods[i]:{}),...food,libraryVersion:'meal-contract-v1'};
    if(i>=0)s.customFoods[i]=next;else s.customFoods.push(next);
  }
  function seedContract(){
    const s=ensureDurableState(readState());

    for(const food of s.customFoods){
      if(!food||typeof food!=='object')continue;
      const id=resolveFoodId(food.id);
      const soupRule=SOUP_BASIS[id];
      if(soupRule)Object.assign(food,soupRule);
      else if(food.cat==='Complete meal'&&food.libraryVersion)food.basis='includes-protein';
      else if(['Soup','Complete meal'].includes(food.cat)&&!food.libraryVersion&&!VALID_BASIS.has(food.basis))food.basis='unknown';

      if(food.cat==='Protein'&&!PLANT_PROTEIN_EXCEPTIONS.has(id))food.providesAnimalProtein=true;
    }

    BASE_VARIANTS.forEach(food=>upsertLibraryFood(s,food));
    EXTRA_PROTEINS.forEach(food=>upsertLibraryFood(s,food));

    const eventId='soup-basis-contract-2026-09-07';
    if(!s.definitionEvents.some(e=>e&&e.id===eventId)){
      s.definitionEvents.push({
        id:eventId,
        effectiveDate:'2026-09-07',
        type:'nutrition-definition-update',
        version:1,
        note:'Soup and stew definitions were separated into base-only and includes-protein forms. Historical log nutrition remains unchanged.'
      });
    }
    writeState(s);
  }

  function staticBasisFor(food){
    if(!food)return null;
    const id=resolveFoodId(food.id);
    if(SOUP_BASIS[id])return SOUP_BASIS[id];
    if(BASE_VARIANTS.some(x=>x.id===id))return {basis:'base-only'};
    if(food.cat==='Complete meal')return {basis:'includes-protein'};
    return null;
  }
  function animalFlagFor(food){
    if(!food)return false;
    const id=resolveFoodId(food.id);
    if(food.providesAnimalProtein===true)return true;
    if(BUILTIN_ANIMAL_IDS.has(id))return true;
    return false;
  }
  function decorateFood(food){
    if(!food||typeof food!=='object')return food;
    const id=resolveFoodId(food.id);
    const out={...food,id};
    const staticRule=staticBasisFor(out);
    if(staticRule)Object.assign(out,staticRule);
    else if(['Soup','Complete meal'].includes(out.cat)&&!VALID_BASIS.has(out.basis))out.basis='unknown';
    if(animalFlagFor(out))out.providesAnimalProtein=true;
    if(id==='banku')out.composition='Fermented corn dough + cassava dough';
    return out;
  }

  function median(values){
    const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length)return null;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function calibrationObservations(state,foodId,pieceKey){
    const id=resolveFoodId(foodId);
    return (state?.pieceCalibration?.observations||[]).filter(x=>resolveFoodId(x?.foodId)===id&&String(x?.pieceKey||'')===String(pieceKey||'')&&Number(x?.grams)>0);
  }
  function personalPieceWeight(state,foodId,pieceKey){
    const rows=calibrationObservations(state,foodId,pieceKey);
    if(rows.length<3)return null;
    return median(rows.map(x=>x.grams));
  }
  function pieceEstimate(state,foodId,pieceKey,count){
    const id=resolveFoodId(foodId);
    const n=Math.max(0,Number(count)||0);
    const personal=personalPieceWeight(state,id,pieceKey);
    const reference=PIECE_WEIGHTS[id]?.[pieceKey];
    const basis=personal??reference??null;
    if(!(basis>0)||!(n>0))return null;
    return {
      grams:n*basis,
      estimatedGrams:n*basis,
      estimateBasisGrams:basis,
      amountQuality:'estimated',
      estimateSource:personal!=null?'personal-piece-weight':'reference-piece-weight',
      observationCount:calibrationObservations(state,id,pieceKey).length
    };
  }

  function deriveRecipeBasis(recipe,getFood){
    let sawUnknown=false;
    for(const ingredient of Array.isArray(recipe?.ingredients)?recipe.ingredients:[]){
      const id=resolveFoodId(ingredient?.foodId);
      const food=typeof getFood==='function'?getFood(id):null;
      if(!food){sawUnknown=true;continue;}
      const f=decorateFood(food);
      if(f.providesAnimalProtein===true||f.basis==='includes-protein')return 'includes-protein';
      if(f.basis==='unknown')sawUnknown=true;
    }
    return sawUnknown?'unknown':'base-only';
  }

  function validateStaticCatalogue(foods){
    const errors=[];
    for(const raw of foods||[]){
      if(!raw||!['Soup','Complete meal'].includes(raw.cat))continue;
      const food=decorateFood(raw);
      const isStatic=!!raw.libraryVersion||SOUP_BASIS[resolveFoodId(raw.id)]||BASE_VARIANTS.some(x=>x.id===resolveFoodId(raw.id))||String(raw.id||'').startsWith('world_')||!String(raw.id||'').startsWith('custom_');
      if(isStatic&&!STATIC_ALLOWED.has(food.basis))errors.push({id:food.id,name:food.name,cat:food.cat,basis:food.basis||null});
    }
    return errors;
  }

  seedContract();

  window.OkelloMealDataContract=Object.freeze({
    version:CONTRACT_VERSION,
    validBasis:Object.freeze([...VALID_BASIS]),
    soupBasis:SOUP_BASIS,
    baseVariants:BASE_VARIANTS,
    pieceWeights:PIECE_WEIGHTS,
    resolveFoodId,
    decorateFood,
    deriveRecipeBasis,
    validateStaticCatalogue,
    calibrationObservations,
    personalPieceWeight,
    pieceEstimate,
    readState
  });
})();
