(() => {
  'use strict';
  const KEY = 'okello_food_tracker_v3';
  const LEGACY = 'okello_food_tracker_v2';
  const extraFoods = [
    {
      id: 'ghana_waakye',
      name: 'Waakye, rice & beans only',
      emoji: '🍚',
      cat: 'Complete meal',
      kcal: 156,
      protein: 5.6,
      fibre: 3.4,
      portion: 250,
      min: 200,
      max: 320,
      note: '200–320 g; base waakye only, add shito, gari, spaghetti, egg, meat or fish separately'
    }
  ];

  try {
    const current = localStorage.getItem(KEY);
    const legacy = localStorage.getItem(LEGACY);
    const state = JSON.parse(current || legacy || 'null') || {targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[]};
    state.customFoods = Array.isArray(state.customFoods) ? state.customFoods : [];

    extraFoods.forEach(food => {
      const existingIndex = state.customFoods.findIndex(f => f && f.id === food.id);
      if (existingIndex >= 0) state.customFoods[existingIndex] = {...state.customFoods[existingIndex], ...food};
      else state.customFoods.push(food);
    });

    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // The main app can still run even if local storage is unavailable.
  }
})();
