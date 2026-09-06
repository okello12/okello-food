(() => {
  'use strict';
  const KEY = 'okello_food_tracker_v3';
  const LEGACY = 'okello_food_tracker_v2';
  const LIBRARY_VERSION = 5;

  // Expanded Ghanaian and everyday-food catalogue.
  // Nutrition values are practical per-100 g estimates. Recipe-dependent foods
  // should be replaced with the user's own saved recipe whenever possible.
  const extraFoods = [
    {"id":"ghana_waakye","name":"Waakye, rice & beans only","emoji":"🍚","cat":"Complete meal","kcal":156,"protein":5.6,"fibre":3.4,"portion":250,"min":200,"max":320,"note":"Base waakye only; log shito, gari, spaghetti, egg, meat or fish separately"},
    {"id":"ghana_fante_kenkey","name":"Fante kenkey","emoji":"🌽","cat":"Starch","kcal":118,"protein":2.2,"fibre":1.8,"portion":220,"min":180,"max":260,"note":"Estimate; recipe and fermentation vary"},
    {"id":"ghana_fufu","name":"Fufu, cassava & plantain","emoji":"🥣","cat":"Starch","kcal":145,"protein":1.4,"fibre":2.1,"portion":250,"min":180,"max":300,"note":"Estimate; weigh cooked fufu"},
    {"id":"ghana_konkonte","name":"Konkonte, prepared","emoji":"🥣","cat":"Starch","kcal":145,"protein":1.8,"fibre":3,"portion":230,"min":180,"max":280,"note":"Prepared cassava flour dough"},
    {"id":"ghana_tuo_zaafi","name":"Tuo zaafi, prepared","emoji":"🥣","cat":"Starch","kcal":120,"protein":2.5,"fibre":1.4,"portion":250,"min":200,"max":300,"note":"Estimate; maize/millet recipe varies"},
    {"id":"ghana_omo_tuo","name":"Omo tuo / rice balls","emoji":"🍚","cat":"Starch","kcal":130,"protein":2.5,"fibre":0.4,"portion":230,"min":180,"max":280,"note":"Cooked rice balls"},
    {"id":"ghana_akple","name":"Akple","emoji":"🥣","cat":"Starch","kcal":135,"protein":2.6,"fibre":1.3,"portion":230,"min":180,"max":280,"note":"Estimate; maize/cassava ratio varies"},
    {"id":"ghana_gari_dry","name":"Gari, dry","emoji":"🌾","cat":"Starch","kcal":360,"protein":1.6,"fibre":2,"portion":45,"min":30,"max":70,"note":"Dry weight; very calorie dense"},
    {"id":"ghana_gari_soaked","name":"Gari soaked in water, no sugar/milk","emoji":"🥣","cat":"Starch","kcal":120,"protein":0.6,"fibre":0.8,"portion":250,"min":180,"max":320,"note":"Water adds weight; log sugar, milk and nuts separately"},
    {"id":"ghana_cassava_boiled","name":"Cassava, boiled","emoji":"🥔","cat":"Starch","kcal":150,"protein":1.2,"fibre":1.8,"portion":220,"min":180,"max":280,"note":"Cooked edible weight"},
    {"id":"ghana_cocoyam_boiled","name":"Cocoyam, boiled","emoji":"🥔","cat":"Starch","kcal":112,"protein":1.5,"fibre":4.1,"portion":250,"min":200,"max":320,"note":"Cooked edible weight"},
    {"id":"ghana_ripe_plantain_boiled","name":"Ripe plantain, boiled","emoji":"🍌","cat":"Starch","kcal":122,"protein":1.2,"fibre":2.3,"portion":220,"min":180,"max":280,"note":"Cooked edible weight"},
    {"id":"ghana_plantain_fried","name":"Fried ripe plantain","emoji":"🍌","cat":"Starch","kcal":250,"protein":1.5,"fibre":2.4,"portion":120,"min":80,"max":160,"note":"Oil uptake varies"},
    {"id":"ghana_yam_fried","name":"Fried yam","emoji":"🍟","cat":"Starch","kcal":230,"protein":2.2,"fibre":3,"portion":150,"min":100,"max":200,"note":"Oil uptake varies"},
    {"id":"ghana_ampesi_yam","name":"Ampesi, boiled yam","emoji":"🍠","cat":"Starch","kcal":116,"protein":1.5,"fibre":3.9,"portion":230,"min":180,"max":300,"note":"Log stew/sauce separately"},
    {"id":"ghana_ampesi_plantain","name":"Ampesi, boiled plantain","emoji":"🍌","cat":"Starch","kcal":116,"protein":1.3,"fibre":2.3,"portion":250,"min":200,"max":300,"note":"Log stew/sauce separately"},
    {"id":"ghana_ampesi_cocoyam","name":"Ampesi, boiled cocoyam","emoji":"🥔","cat":"Starch","kcal":112,"protein":1.5,"fibre":4.1,"portion":250,"min":200,"max":320,"note":"Log stew/sauce separately"},
    {"id":"ghana_spaghetti_cooked","name":"Spaghetti / pasta, cooked","emoji":"🍝","cat":"Starch","kcal":158,"protein":5.8,"fibre":1.8,"portion":180,"min":130,"max":220,"note":"Plain cooked pasta"},
    {"id":"ghana_instant_noodles","name":"Instant noodles, prepared","emoji":"🍜","cat":"Starch","kcal":170,"protein":4,"fibre":1.2,"portion":220,"min":160,"max":300,"note":"Brands vary; packet label is better"},
    {"id":"ghana_red_red","name":"Red-red, beans stew","emoji":"🫘","cat":"Complete meal","kcal":185,"protein":7.5,"fibre":6.8,"portion":250,"min":180,"max":320,"note":"Estimate; palm oil amount changes calories"},
    {"id":"ghana_gari_beans","name":"Gari and beans / gob3, mixed","emoji":"🫘","cat":"Complete meal","kcal":205,"protein":6.5,"fibre":5.5,"portion":250,"min":180,"max":320,"note":"Estimate; log extra oil, fish, egg or plantain separately"},
    {"id":"ghana_gari_foto","name":"Gari foto","emoji":"🥘","cat":"Complete meal","kcal":190,"protein":4.5,"fibre":2.8,"portion":250,"min":180,"max":320,"note":"Estimate; oil and protein additions vary"},
    {"id":"ghana_mpotompoto","name":"Mpotompoto / yam porridge","emoji":"🥘","cat":"Complete meal","kcal":120,"protein":4,"fibre":2.8,"portion":350,"min":250,"max":450,"note":"Estimate; oil, fish and meat change calories"},
    {"id":"ghana_plantain_porridge","name":"Plantain porridge","emoji":"🥘","cat":"Complete meal","kcal":115,"protein":3.5,"fibre":2.7,"portion":350,"min":250,"max":450,"note":"Estimate; fish, meat and oil vary"},
    {"id":"ghana_apapransa","name":"Aprapransa / apapransa","emoji":"🥘","cat":"Complete meal","kcal":190,"protein":6,"fibre":2.5,"portion":250,"min":180,"max":320,"note":"Estimate; palm soup/oil and cornmeal ratio varies"},
    {"id":"ghana_eto","name":"Eto / oto, mashed yam or plantain","emoji":"🥣","cat":"Complete meal","kcal":190,"protein":3.5,"fibre":3,"portion":220,"min":160,"max":280,"note":"Estimate; palm oil, egg and peanuts should be logged if generous"},
    {"id":"ghana_tatale","name":"Tatale, plantain pancake","emoji":"🥞","cat":"Complete meal","kcal":190,"protein":3.5,"fibre":2.2,"portion":150,"min":100,"max":200,"note":"Estimate; frying oil varies"},
    {"id":"ghana_yam_egg_stew","name":"Yam with egg stew, mixed plate","emoji":"🍲","cat":"Complete meal","kcal":165,"protein":6.5,"fibre":2.3,"portion":350,"min":280,"max":450,"note":"Plate estimate; separate logging is more accurate"},
    {"id":"ghana_rice_stew","name":"Rice with tomato stew, mixed plate","emoji":"🍛","cat":"Complete meal","kcal":170,"protein":4.5,"fibre":1.5,"portion":350,"min":280,"max":450,"note":"Plate estimate; meat/fish should be logged separately"},
    {"id":"ghana_jollof_chicken","name":"Jollof with chicken, mixed plate","emoji":"🍛","cat":"Complete meal","kcal":190,"protein":9,"fibre":1.5,"portion":350,"min":280,"max":450,"note":"Very recipe dependent; separate jollof and chicken is more accurate"},
    {"id":"ghana_groundnut_soup","name":"Groundnut / nkatenkwan / peanut soup","emoji":"🍲","cat":"Soup","kcal":120,"protein":6,"fibre":1.8,"portion":350,"min":250,"max":450,"note":"Estimate; peanut amount and meat vary"},
    {"id":"ghana_palmnut_soup","name":"Palm nut / abenkwan soup","emoji":"🍲","cat":"Soup","kcal":105,"protein":4,"fibre":1.5,"portion":350,"min":250,"max":450,"note":"Estimate; palm concentrate and meat/fish vary"},
    {"id":"ghana_ebunuebunu","name":"Ebunuebunu / green soup","emoji":"🍲","cat":"Soup","kcal":65,"protein":5,"fibre":1.5,"portion":350,"min":250,"max":450,"note":"Estimate; meat/fish and oil vary"},
    {"id":"ghana_ayoyo_soup","name":"Ayoyo soup","emoji":"🍲","cat":"Soup","kcal":55,"protein":3.5,"fibre":2,"portion":350,"min":250,"max":450,"note":"Estimate; meat and dawadawa vary"},
    {"id":"ghana_okro_stew","name":"Okro stew","emoji":"🥘","cat":"Soup","kcal":95,"protein":5,"fibre":2.8,"portion":300,"min":220,"max":400,"note":"Estimate; oil and assorted meat/fish matter"},
    {"id":"ghana_kontomire_stew","name":"Kontomire stew / palava sauce","emoji":"🥬","cat":"Soup","kcal":130,"protein":6.5,"fibre":3.5,"portion":220,"min":150,"max":300,"note":"Estimate; palm oil, agushie, egg and fish change calories"},
    {"id":"ghana_garden_egg_stew","name":"Garden egg stew","emoji":"🍆","cat":"Soup","kcal":105,"protein":4,"fibre":2.5,"portion":220,"min":150,"max":300,"note":"Estimate; oil and fish vary"},
    {"id":"ghana_agushie_stew","name":"Agushie / egusi stew","emoji":"🥘","cat":"Soup","kcal":180,"protein":8,"fibre":2.5,"portion":180,"min":120,"max":250,"note":"Seed-heavy and calorie dense; recipe varies"},
    {"id":"ghana_tomato_stew","name":"Ghana tomato stew, no meat","emoji":"🍅","cat":"Soup","kcal":100,"protein":2,"fibre":1.5,"portion":150,"min":100,"max":220,"note":"Oil amount is the main variable"},
    {"id":"ghana_shito","name":"Shito","emoji":"🌶️","cat":"Extras","kcal":300,"protein":5,"fibre":2,"portion":20,"min":10,"max":30,"note":"Very calorie dense; oil amount varies greatly"},
    {"id":"ghana_fresh_pepper","name":"Fresh pepper sauce, no oil","emoji":"🌶️","cat":"Extras","kcal":35,"protein":1.5,"fibre":2,"portion":50,"min":25,"max":80,"note":"Fresh tomato/onion/chilli style"},
    {"id":"ghana_hausa_koko","name":"Hausa koko, unsweetened","emoji":"🥣","cat":"Starch","kcal":55,"protein":1.5,"fibre":0.8,"portion":350,"min":250,"max":450,"note":"Log sugar and milk separately"},
    {"id":"ghana_tom_brown","name":"Tom Brown porridge, unsweetened","emoji":"🥣","cat":"Starch","kcal":75,"protein":3,"fibre":1.5,"portion":350,"min":250,"max":450,"note":"Estimate; cereal blend varies; log sugar/milk separately"},
    {"id":"ghana_rice_water","name":"Rice water porridge, unsweetened","emoji":"🥣","cat":"Starch","kcal":65,"protein":1.3,"fibre":0.3,"portion":350,"min":250,"max":450,"note":"Log sugar and milk separately"},
    {"id":"ghana_asaana","name":"Asaana / caramelised corn drink","emoji":"🥤","cat":"Extras","kcal":70,"protein":0.5,"fibre":0.2,"portion":300,"min":200,"max":400,"note":"Sweetness varies; estimate"},
    {"id":"ghana_sobolo_unsweet","name":"Sobolo, unsweetened","emoji":"🥤","cat":"Extras","kcal":10,"protein":0.2,"fibre":0,"portion":300,"min":200,"max":500,"note":"Without added sugar or syrup"},
    {"id":"ghana_sobolo_sweet","name":"Sobolo, sweetened","emoji":"🥤","cat":"Extras","kcal":45,"protein":0.2,"fibre":0,"portion":300,"min":200,"max":400,"note":"Sugar level varies widely"},
    {"id":"ghana_lamugin","name":"Lamugin, sweetened ginger drink","emoji":"🥤","cat":"Extras","kcal":45,"protein":0.2,"fibre":0.2,"portion":300,"min":200,"max":400,"note":"Sugar level varies widely"},
    {"id":"ghana_coconut_water","name":"Coconut water","emoji":"🥥","cat":"Extras","kcal":19,"protein":0.7,"fibre":1.1,"portion":300,"min":200,"max":500,"note":"Natural, unsweetened"},
    {"id":"ghana_koose","name":"Koose / bean cake","emoji":"🫘","cat":"Complete meal","kcal":250,"protein":10,"fibre":5,"portion":100,"min":70,"max":150,"note":"Frying oil varies"},
    {"id":"ghana_bofrot","name":"Bofrot / puff-puff","emoji":"🍩","cat":"Extras","kcal":330,"protein":5,"fibre":1.5,"portion":60,"min":40,"max":90,"note":"Fried dough; size and oil vary"},
    {"id":"ghana_kelewele","name":"Kelewele","emoji":"🍌","cat":"Extras","kcal":250,"protein":1.5,"fibre":2.5,"portion":120,"min":80,"max":160,"note":"Fried plantain; oil uptake varies"},
    {"id":"ghana_plantain_chips","name":"Plantain chips","emoji":"🍌","cat":"Extras","kcal":520,"protein":2.2,"fibre":3.5,"portion":30,"min":20,"max":45,"note":"Check packet label where available"},
    {"id":"ghana_yam_chips","name":"Yam chips","emoji":"🍟","cat":"Extras","kcal":230,"protein":2.2,"fibre":3,"portion":120,"min":80,"max":170,"note":"Frying oil varies"},
    {"id":"ghana_meat_pie","name":"Ghana meat pie","emoji":"🥟","cat":"Extras","kcal":310,"protein":9,"fibre":1.5,"portion":100,"min":70,"max":140,"note":"Bakery recipes vary"},
    {"id":"ghana_fish_pie","name":"Fish pie / fish pastry","emoji":"🥟","cat":"Extras","kcal":290,"protein":9,"fibre":1.5,"portion":100,"min":70,"max":140,"note":"Bakery recipes vary"},
    {"id":"ghana_chinchin","name":"Chin chin","emoji":"🍪","cat":"Extras","kcal":450,"protein":7,"fibre":1.8,"portion":30,"min":20,"max":45,"note":"Very calorie dense"},
    {"id":"ghana_nkatie_cake","name":"Nkatie cake / peanut brittle","emoji":"🥜","cat":"Extras","kcal":500,"protein":15,"fibre":5,"portion":25,"min":15,"max":40,"note":"Peanuts plus sugar; calorie dense"},
    {"id":"ghana_coconut_candy","name":"Coconut candy","emoji":"🥥","cat":"Extras","kcal":430,"protein":3.5,"fibre":6,"portion":25,"min":15,"max":40,"note":"Coconut and sugar"},
    {"id":"ghana_groundnuts_roasted","name":"Groundnuts / peanuts, roasted","emoji":"🥜","cat":"Extras","kcal":585,"protein":25,"fibre":8,"portion":25,"min":15,"max":35,"note":"Measure carefully"},
    {"id":"ghana_corn_roasted","name":"Corn / maize, roasted","emoji":"🌽","cat":"Starch","kcal":120,"protein":4,"fibre":3,"portion":180,"min":120,"max":250,"note":"Edible kernels estimate"},
    {"id":"ghana_corn_boiled","name":"Corn / maize, boiled","emoji":"🌽","cat":"Starch","kcal":96,"protein":3.4,"fibre":2.4,"portion":180,"min":120,"max":250,"note":"Edible kernels estimate"},
    {"id":"ghana_groundnuts_boiled","name":"Groundnuts / peanuts, boiled","emoji":"🥜","cat":"Extras","kcal":318,"protein":13.5,"fibre":8.5,"portion":50,"min":30,"max":80,"note":"Edible shelled weight"},
    {"id":"ghana_chicken_thigh","name":"Chicken thigh, cooked skinless","emoji":"🍗","cat":"Protein","kcal":190,"protein":26,"fibre":0,"portion":180,"min":150,"max":220,"note":"Cooked edible weight"},
    {"id":"ghana_fried_chicken","name":"Fried chicken","emoji":"🍗","cat":"Protein","kcal":260,"protein":25,"fibre":0,"portion":160,"min":120,"max":200,"note":"Breading and oil change calories"},
    {"id":"ghana_guinea_fowl","name":"Guinea fowl, cooked","emoji":"🍗","cat":"Protein","kcal":158,"protein":29,"fibre":0,"portion":200,"min":160,"max":240,"note":"Cooked edible weight"},
    {"id":"ghana_fried_fish","name":"Fish, fried","emoji":"🐟","cat":"Protein","kcal":220,"protein":23,"fibre":0,"portion":180,"min":140,"max":220,"note":"Species and oil uptake vary"},
    {"id":"ghana_smoked_fish","name":"Fish, smoked","emoji":"🐟","cat":"Protein","kcal":180,"protein":30,"fibre":0,"portion":120,"min":80,"max":160,"note":"Species varies; edible weight"},
    {"id":"ghana_dried_anchovies","name":"Dried anchovies / kako / small fish","emoji":"🐟","cat":"Protein","kcal":250,"protein":45,"fibre":0,"portion":30,"min":15,"max":50,"note":"Dry and concentrated; sodium can be high"},
    {"id":"ghana_cowfoot","name":"Cow foot, cooked edible portion","emoji":"🍖","cat":"Protein","kcal":210,"protein":24,"fibre":0,"portion":150,"min":100,"max":200,"note":"Fat and bone content vary"},
    {"id":"ghana_tripe","name":"Tripe, cooked","emoji":"🥩","cat":"Protein","kcal":95,"protein":12,"fibre":0,"portion":180,"min":140,"max":220,"note":"Cooked edible weight"},
    {"id":"ghana_oxtail","name":"Oxtail, cooked edible meat","emoji":"🍖","cat":"Protein","kcal":260,"protein":23,"fibre":0,"portion":150,"min":100,"max":180,"note":"Fat content varies; exclude bone"},
    {"id":"ghana_beef_liver","name":"Beef liver, cooked","emoji":"🥩","cat":"Protein","kcal":175,"protein":26,"fibre":0,"portion":120,"min":80,"max":150,"note":"Nutrient dense; cooked weight"},
    {"id":"ghana_gizzard","name":"Chicken gizzard, cooked","emoji":"🍗","cat":"Protein","kcal":155,"protein":30,"fibre":0,"portion":150,"min":100,"max":200,"note":"Cooked weight"},
    {"id":"ghana_chinchinga","name":"Chinchinga / beef kebab","emoji":"🍢","cat":"Protein","kcal":220,"protein":24,"fibre":0,"portion":150,"min":100,"max":200,"note":"Oil, spice coating and cut of meat vary"},
    {"id":"ghana_mango","name":"Mango","emoji":"🥭","cat":"Extras","kcal":60,"protein":0.8,"fibre":1.6,"portion":150,"min":100,"max":220,"note":"Edible flesh"},
    {"id":"ghana_pineapple","name":"Pineapple","emoji":"🍍","cat":"Extras","kcal":50,"protein":0.5,"fibre":1.4,"portion":180,"min":120,"max":250,"note":"Edible flesh"},
    {"id":"ghana_pawpaw","name":"Pawpaw / papaya","emoji":"🍈","cat":"Extras","kcal":43,"protein":0.5,"fibre":1.7,"portion":200,"min":150,"max":300,"note":"Edible flesh"},
    {"id":"ghana_orange","name":"Orange","emoji":"🍊","cat":"Extras","kcal":47,"protein":0.9,"fibre":2.4,"portion":160,"min":120,"max":220,"note":"Edible flesh"},
    {"id":"ghana_apple","name":"Apple","emoji":"🍎","cat":"Extras","kcal":52,"protein":0.3,"fibre":2.4,"portion":180,"min":120,"max":220,"note":"Edible flesh"},
    {"id":"ghana_watermelon","name":"Watermelon","emoji":"🍉","cat":"Extras","kcal":30,"protein":0.6,"fibre":0.4,"portion":300,"min":200,"max":450,"note":"Edible flesh"},
    {"id":"ghana_grapes","name":"Grapes","emoji":"🍇","cat":"Extras","kcal":69,"protein":0.7,"fibre":0.9,"portion":150,"min":100,"max":220,"note":"Edible fruit"},
    {"id":"ghana_guava","name":"Guava","emoji":"🍈","cat":"Extras","kcal":68,"protein":2.6,"fibre":5.4,"portion":150,"min":100,"max":220,"note":"Edible fruit"},
    {"id":"ghana_coconut_flesh","name":"Fresh coconut flesh","emoji":"🥥","cat":"Extras","kcal":354,"protein":3.3,"fibre":9,"portion":40,"min":25,"max":60,"note":"Calorie dense"},
    {"id":"ghana_kontomire_leaves","name":"Kontomire / cocoyam leaves, cooked","emoji":"🥬","cat":"Vegetables","kcal":35,"protein":3,"fibre":3,"portion":200,"min":150,"max":300,"note":"Without oil"},
    {"id":"ghana_okra_plain","name":"Okra, cooked plain","emoji":"🥬","cat":"Vegetables","kcal":33,"protein":1.9,"fibre":3.2,"portion":200,"min":150,"max":300,"note":"Without oil"},
    {"id":"ghana_garden_eggs","name":"Garden eggs, cooked","emoji":"🍆","cat":"Vegetables","kcal":35,"protein":1.2,"fibre":2.5,"portion":200,"min":150,"max":300,"note":"Without oil"},
    {"id":"ghana_aubergine","name":"Aubergine / eggplant, cooked","emoji":"🍆","cat":"Vegetables","kcal":35,"protein":0.8,"fibre":2.5,"portion":220,"min":150,"max":320,"note":"Without oil"},
    {"id":"ghana_cabbage","name":"Cabbage, cooked or raw","emoji":"🥬","cat":"Vegetables","kcal":25,"protein":1.3,"fibre":2.5,"portion":200,"min":150,"max":350,"note":"Without dressing/oil"},
    {"id":"ghana_carrot","name":"Carrot","emoji":"🥕","cat":"Vegetables","kcal":41,"protein":0.9,"fibre":2.8,"portion":150,"min":100,"max":250,"note":"Raw or lightly cooked"},
    {"id":"ghana_cucumber","name":"Cucumber","emoji":"🥒","cat":"Vegetables","kcal":15,"protein":0.7,"fibre":0.5,"portion":200,"min":150,"max":350,"note":"Raw"},
    {"id":"ghana_tomato","name":"Tomato","emoji":"🍅","cat":"Vegetables","kcal":18,"protein":0.9,"fibre":1.2,"portion":200,"min":150,"max":350,"note":"Raw"},
    {"id":"ghana_cheddar","name":"Cheddar cheese","emoji":"🧀","cat":"Dairy","kcal":403,"protein":25,"fibre":0,"portion":30,"min":20,"max":40,"note":"Check pack label"},
    {"id":"ghana_butter","name":"Butter","emoji":"🧈","cat":"Extras","kcal":717,"protein":0.9,"fibre":0,"portion":10,"min":5,"max":15,"note":"Measure carefully"},
    {"id":"ghana_cashews","name":"Cashew nuts","emoji":"🥜","cat":"Extras","kcal":553,"protein":18,"fibre":3.3,"portion":25,"min":15,"max":35,"note":"Measure carefully"},
    {"id":"ghana_almonds_whole","name":"Almonds, whole","emoji":"🌰","cat":"Extras","kcal":579,"protein":21,"fibre":12.5,"portion":25,"min":15,"max":35,"note":"Measure carefully"}
  ];

  try {
    const current = localStorage.getItem(KEY);
    const legacy = localStorage.getItem(LEGACY);
    const state = JSON.parse(current || legacy || 'null') || {
      targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[]
    };

    state.customFoods = Array.isArray(state.customFoods) ? state.customFoods : [];

    extraFoods.forEach(food => {
      const existingIndex = state.customFoods.findIndex(f => f && f.id === food.id);
      if (existingIndex >= 0) {
        state.customFoods[existingIndex] = {...state.customFoods[existingIndex], ...food, libraryVersion:LIBRARY_VERSION};
      } else {
        state.customFoods.push({...food, libraryVersion:LIBRARY_VERSION});
      }
    });

    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // The main tracker can still run if local storage is unavailable.
  }
})();
