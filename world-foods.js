(() => {
  'use strict';
  const KEY='okello_food_tracker_v3';
  const LEGACY='okello_food_tracker_v2';
  const LIBRARY_VERSION=1;

  // Broad international catalogue for everyday tracking.
  // Simple foods use practical reference values. Mixed dishes are estimates because recipes vary.
  const rows=[
    // Global staples and everyday foods
    ['world_quinoa','Quinoa, cooked (Global)','🌾','Starch',120,4.4,2.8,185,150,250,'Global','Reference','Plain cooked quinoa'],
    ['world_couscous','Couscous, cooked (North Africa / Global)','🌾','Starch',112,3.8,1.4,200,150,250,'North Africa & Middle East','Reference','Plain cooked couscous'],
    ['world_bulgur','Bulgur wheat, cooked (Middle East)','🌾','Starch',83,3.1,4.5,200,150,260,'North Africa & Middle East','Reference','Plain cooked bulgur'],
    ['world_barley','Pearl barley, cooked (Europe / Global)','🌾','Starch',123,2.3,3.8,200,150,260,'Europe','Reference','Plain cooked barley'],
    ['world_polenta','Polenta, cooked (Italy)','🥣','Starch',85,2,1,250,180,320,'Europe','Reference','Plain cooked polenta'],
    ['world_jasmine_rice','Jasmine rice, cooked (Southeast Asia)','🍚','Starch',130,2.4,0.4,200,150,250,'Southeast Asia','Reference','Plain cooked rice'],
    ['world_sticky_rice','Sticky rice, cooked (Southeast Asia)','🍚','Starch',169,3.5,0.7,180,130,230,'Southeast Asia','Reference','Plain cooked glutinous rice'],
    ['world_egg_noodles','Egg noodles, cooked (Global)','🍜','Starch',138,4.5,1.2,200,150,260,'Global','Reference','Plain cooked noodles'],
    ['world_rice_noodles','Rice noodles, cooked (Asia)','🍜','Starch',109,1.8,1,220,160,280,'East & Southeast Asia','Reference','Plain cooked rice noodles'],
    ['world_udon','Udon noodles, cooked (Japan)','🍜','Starch',127,3.1,1.2,220,160,280,'East Asia','Reference','Plain cooked udon'],
    ['world_soba','Soba noodles, cooked (Japan)','🍜','Starch',99,5.1,2.3,220,160,280,'East Asia','Reference','Plain cooked soba'],
    ['world_tortilla_corn','Corn tortilla (Mexico)','🫓','Starch',218,5.7,6.3,60,30,120,'Latin America & Caribbean','Reference','About 2 small tortillas'],
    ['world_tortilla_flour','Flour tortilla (Mexico / US)','🫓','Starch',312,8.3,2.7,65,35,130,'Latin America & Caribbean','Reference','Check pack label when possible'],
    ['world_pita','Pita bread (Middle East)','🫓','Starch',275,9.1,2.2,70,35,110,'North Africa & Middle East','Reference','Plain pita'],
    ['world_baguette','Baguette / French bread (France)','🥖','Starch',274,8.8,2.3,100,60,150,'Europe','Reference','Plain white baguette'],
    ['world_rye_bread','Rye bread (Northern Europe)','🍞','Starch',259,8.5,5.8,90,60,140,'Europe','Reference','Check pack label when possible'],
    ['world_wrap','Wholemeal wrap (Global)','🫓','Starch',290,9,7,70,45,110,'Global','Reference','Pack values vary'],
    ['world_granola','Granola (Global)','🥣','Starch',450,10,7,45,30,60,'Global','Estimated','Brands vary widely'],
    ['world_cornflakes','Corn flakes cereal (Global)','🥣','Starch',357,7.5,3,40,30,60,'Global','Reference','Dry cereal, check pack label'],
    ['world_muesli','Muesli, unsweetened (Europe)','🥣','Starch',370,11,8,50,35,70,'Europe','Estimated','Blend varies'],

    // Europe and UK
    ['world_scrambled_eggs','Scrambled eggs, plain (UK / Global)','🍳','Protein',149,10,0,150,100,220,'Europe','Estimated','Butter or oil changes calories'],
    ['world_baked_beans','Baked beans in tomato sauce (UK)','🫘','Beans',78,4.7,4.2,200,150,300,'Europe','Reference','Typical canned product'],
    ['world_fish_chips','Fish and chips (UK)','🐟','Complete meal',220,10,2.2,400,280,550,'Europe','Estimated','Batter, frying oil and chip portion vary greatly'],
    ['world_shepherds_pie','Shepherd’s pie (UK / Ireland)','🥧','Complete meal',145,8.5,1.6,350,250,450,'Europe','Estimated','Recipe dependent'],
    ['world_cottage_pie','Cottage pie (UK)','🥧','Complete meal',150,9,1.7,350,250,450,'Europe','Estimated','Recipe dependent'],
    ['world_lasagne','Beef lasagne (Italy / Global)','🍝','Complete meal',155,8.5,1.2,350,250,450,'Europe','Estimated','Cheese and sauce vary'],
    ['world_bolognese','Spaghetti bolognese, mixed (Italy / Global)','🍝','Complete meal',145,7.5,1.8,400,300,500,'Europe','Estimated','Meat, pasta and oil ratio vary'],
    ['world_margherita_pizza','Margherita pizza (Italy)','🍕','Complete meal',250,10,2.3,250,180,350,'Europe','Estimated','Crust and cheese vary'],
    ['world_pepperoni_pizza','Pepperoni pizza (Global)','🍕','Complete meal',290,12,2.2,250,180,350,'Europe','Estimated','Restaurant and frozen pizzas vary'],
    ['world_risotto','Risotto, basic (Italy)','🍚','Complete meal',150,4,1,300,220,400,'Europe','Estimated','Butter, cheese and stock vary'],
    ['world_paella','Paella, mixed seafood/chicken (Spain)','🥘','Complete meal',145,8,1.2,350,250,450,'Europe','Estimated','Oil and protein mix vary'],
    ['world_spanish_omelette','Spanish tortilla / potato omelette (Spain)','🍳','Complete meal',190,7.5,1.3,200,140,300,'Europe','Estimated','Oil uptake varies'],
    ['world_greek_salad','Greek salad (Greece)','🥗','Vegetables',95,3,2,300,200,400,'Europe','Estimated','Feta and olive oil drive calories'],
    ['world_moussaka','Moussaka (Greece)','🍆','Complete meal',140,7.5,1.8,350,250,450,'Europe','Estimated','Recipe dependent'],
    ['world_goulash','Beef goulash (Central Europe)','🥘','Complete meal',120,10,1.2,350,250,450,'Europe','Estimated','Recipe dependent'],
    ['world_pierogi','Pierogi, potato/cheese (Poland)','🥟','Complete meal',195,6,1.7,200,140,300,'Europe','Estimated','Filling and butter vary'],

    // South Asia
    ['world_chapati','Chapati / roti, whole wheat (South Asia)','🫓','Starch',297,9.5,7,70,45,110,'South Asia','Estimated','Oil or ghee changes calories'],
    ['world_naan','Naan bread (South Asia)','🫓','Starch',300,9,2.5,100,70,140,'South Asia','Estimated','Butter/ghee varies'],
    ['world_paratha','Paratha (South Asia)','🫓','Starch',330,7,4,90,60,130,'South Asia','Estimated','Oil/ghee varies'],
    ['world_biryani_chicken','Chicken biryani (South Asia)','🍛','Complete meal',170,8.5,1.1,350,250,450,'South Asia','Estimated','Rice, oil and chicken ratio vary'],
    ['world_pulao','Vegetable pulao / pilau (South Asia)','🍚','Complete meal',155,3.5,1.5,300,220,400,'South Asia','Estimated','Oil varies'],
    ['world_chicken_curry','Chicken curry (South Asia)','🍛','Soup',145,13,1.2,250,180,350,'South Asia','Estimated','Sauce and oil vary'],
    ['world_lamb_curry','Lamb curry (South Asia)','🍛','Soup',180,12,1.2,250,180,350,'South Asia','Estimated','Cut of lamb and oil vary'],
    ['world_dal','Dal / lentil curry (South Asia)','🫘','Beans',125,7,5.5,250,180,350,'South Asia','Estimated','Tempering oil varies'],
    ['world_chana_masala','Chana masala (South Asia)','🫘','Beans',145,7.5,6,250,180,350,'South Asia','Estimated','Oil varies'],
    ['world_rajma','Rajma / kidney bean curry (India)','🫘','Beans',130,7,6,250,180,350,'South Asia','Estimated','Oil varies'],
    ['world_saag_paneer','Saag paneer (India)','🥬','Complete meal',135,7,2.5,250,180,350,'South Asia','Estimated','Paneer and cream vary'],
    ['world_paneer_tikka','Paneer tikka (India)','🧀','Protein',210,14,1.5,180,120,250,'South Asia','Estimated','Marinade and oil vary'],
    ['world_tandoori_chicken','Tandoori chicken, edible (South Asia)','🍗','Protein',180,25,0.5,220,160,300,'South Asia','Estimated','Skin and marinade vary'],
    ['world_samosa_veg','Vegetable samosa (South Asia)','🥟','Extras',260,5,4,80,50,130,'South Asia','Estimated','Frying oil and size vary'],
    ['world_idli','Idli (South India)','🍥','Starch',145,4.5,1.5,120,80,180,'South Asia','Estimated','Fermented rice/lentil cake'],
    ['world_dosa','Plain dosa (South India)','🥞','Starch',170,4.5,1.5,120,80,180,'South Asia','Estimated','Oil used on pan varies'],
    ['world_sambar','Sambar (South India)','🍲','Beans',70,3.5,3.5,300,200,400,'South Asia','Estimated','Vegetables and lentils vary'],

    // East Asia
    ['world_fried_rice','Fried rice (Chinese style)','🍚','Complete meal',175,5,1.3,300,220,400,'East Asia','Estimated','Oil, egg and meat vary'],
    ['world_chow_mein','Chow mein noodles (Chinese style)','🍜','Complete meal',185,6,2,300,220,400,'East Asia','Estimated','Oil and protein vary'],
    ['world_sweet_sour_chicken','Sweet and sour chicken (Chinese style)','🍗','Complete meal',190,11,1,250,180,350,'East Asia','Estimated','Batter and sauce sugar vary'],
    ['world_stirfry_beef','Beef and vegetable stir fry (Chinese style)','🥘','Complete meal',125,12,2,300,220,400,'East Asia','Estimated','Oil and sauce vary'],
    ['world_mapo_tofu','Mapo tofu (China)','🌶️','Complete meal',135,8,1.7,300,220,400,'East Asia','Estimated','Pork and oil vary'],
    ['world_tofu_firm','Firm tofu (East Asia)','◻️','Protein',144,17,2.3,180,120,250,'East Asia','Reference','Plain firm tofu'],
    ['world_edamame','Edamame, cooked shelled (Japan)','🫘','Beans',121,12,5.2,160,100,220,'East Asia','Reference','Plain cooked'],
    ['world_sushi_salmon_roll','Salmon sushi roll (Japan)','🍣','Complete meal',150,6.5,1,200,140,300,'East Asia','Estimated','Rice and filling vary'],
    ['world_sashimi_salmon','Salmon sashimi (Japan)','🍣','Protein',208,20,0,150,100,220,'East Asia','Reference','Raw salmon only'],
    ['world_ramen','Ramen with broth and toppings (Japan)','🍜','Complete meal',110,5.5,1,500,350,700,'East Asia','Estimated','Broth, noodles and toppings vary greatly'],
    ['world_teriyaki_chicken','Teriyaki chicken (Japan)','🍗','Protein',165,20,0.5,220,160,300,'East Asia','Estimated','Sauce sugar varies'],
    ['world_gyoza','Gyoza / dumplings (Japan)','🥟','Complete meal',190,8,2,150,100,220,'East Asia','Estimated','Filling and cooking method vary'],
    ['world_miso_soup','Miso soup (Japan)','🍲','Soup',35,2.5,1,300,200,400,'East Asia','Estimated','Tofu and seaweed vary'],
    ['world_bibimbap','Bibimbap (Korea)','🍚','Complete meal',145,7,2.3,400,300,500,'East Asia','Estimated','Rice, meat, egg and sauce vary'],
    ['world_bulgogi','Bulgogi beef (Korea)','🥩','Protein',200,20,0.7,200,140,280,'East Asia','Estimated','Sugar and marinade vary'],
    ['world_kimchi','Kimchi (Korea)','🥬','Vegetables',23,1.1,2.4,100,50,180,'East Asia','Reference','Fermented cabbage style'],

    // Southeast Asia
    ['world_pad_thai','Pad Thai (Thailand)','🍜','Complete meal',180,7,1.5,350,250,450,'Southeast Asia','Estimated','Oil, peanuts and sauce vary'],
    ['world_thai_green_curry','Thai green curry with chicken','🍛','Soup',140,9,1.2,300,220,400,'Southeast Asia','Estimated','Coconut milk varies'],
    ['world_thai_red_curry','Thai red curry with chicken','🍛','Soup',145,9,1.2,300,220,400,'Southeast Asia','Estimated','Coconut milk varies'],
    ['world_tom_yum','Tom yum soup (Thailand)','🍲','Soup',45,4,1,350,250,450,'Southeast Asia','Estimated','Seafood and coconut versions vary'],
    ['world_pho_beef','Beef pho (Vietnam)','🍜','Complete meal',75,6,0.8,550,400,700,'Southeast Asia','Estimated','Noodle and beef amounts vary'],
    ['world_banh_mi','Banh mi sandwich (Vietnam)','🥖','Complete meal',220,10,1.5,250,180,350,'Southeast Asia','Estimated','Meat and sauces vary'],
    ['world_spring_roll_fresh','Fresh rice paper spring rolls (Vietnam)','🥬','Complete meal',120,6,2,180,120,260,'Southeast Asia','Estimated','Filling and dipping sauce vary'],
    ['world_spring_roll_fried','Fried spring rolls (Southeast Asia)','🥟','Extras',250,8,2,100,60,160,'Southeast Asia','Estimated','Frying oil varies'],
    ['world_nasi_goreng','Nasi goreng (Indonesia)','🍚','Complete meal',175,6,1.3,350,250,450,'Southeast Asia','Estimated','Oil and toppings vary'],
    ['world_satay_chicken','Chicken satay, no extra sauce (Indonesia / Malaysia)','🍢','Protein',190,24,0.5,180,120,250,'Southeast Asia','Estimated','Marinade varies'],
    ['world_laksa','Laksa noodle soup (Malaysia / Singapore)','🍜','Complete meal',130,6,1.2,500,350,650,'Southeast Asia','Estimated','Coconut broth varies'],

    // Middle East and North Africa
    ['world_hummus','Hummus (Middle East)','🫘','Beans',166,7.9,6,80,50,120,'North Africa & Middle East','Reference','Tahini and oil vary slightly'],
    ['world_falafel','Falafel (Middle East)','🧆','Protein',333,13,5,100,70,150,'North Africa & Middle East','Estimated','Frying oil varies'],
    ['world_tabouleh','Tabbouleh (Levant)','🥗','Vegetables',100,3,3,200,140,300,'North Africa & Middle East','Estimated','Oil and bulgur ratio vary'],
    ['world_baba_ganoush','Baba ganoush (Middle East)','🍆','Vegetables',110,3,4,100,60,150,'North Africa & Middle East','Estimated','Tahini and oil vary'],
    ['world_labneh','Labneh (Middle East)','🥛','Dairy',150,9,0,100,60,150,'North Africa & Middle East','Estimated','Fat level varies'],
    ['world_chicken_shawarma','Chicken shawarma, meat only (Middle East)','🍗','Protein',190,24,0.5,200,140,280,'North Africa & Middle East','Estimated','Marinade and skin vary'],
    ['world_lamb_kebab','Lamb kebab, cooked (Middle East)','🍢','Protein',230,24,0,180,120,250,'North Africa & Middle East','Estimated','Fat content varies'],
    ['world_shakshuka','Shakshuka (North Africa / Middle East)','🍳','Complete meal',95,5.5,1.8,300,220,400,'North Africa & Middle East','Estimated','Egg count and oil vary'],
    ['world_lentil_soup_me','Lentil soup (Middle East)','🍲','Beans',80,5,3.5,350,250,450,'North Africa & Middle East','Estimated','Oil and lentil concentration vary'],
    ['world_chicken_tagine','Chicken tagine (Morocco)','🥘','Complete meal',120,12,2,350,250,450,'North Africa & Middle East','Estimated','Oil, olives and fruit vary'],
    ['world_harira','Harira soup (Morocco)','🍲','Soup',75,4.5,3,400,300,500,'North Africa & Middle East','Estimated','Lentils, chickpeas and meat vary'],

    // Africa beyond Ghana
    ['world_eba','Eba / garri swallow (Nigeria)','🥣','Starch',160,1.3,1.5,250,180,320,'West Africa','Estimated','Prepared garri dough'],
    ['world_amala','Amala, prepared (Nigeria)','🥣','Starch',135,2.2,4,250,180,320,'West Africa','Estimated','Yam flour preparation varies'],
    ['world_pounded_yam','Pounded yam (Nigeria)','🥣','Starch',140,1.8,2.5,250,180,320,'West Africa','Estimated','Cooked prepared weight'],
    ['world_egusi_soup','Egusi soup (Nigeria / West Africa)','🥘','Soup',190,10,2.5,250,180,350,'West Africa','Estimated','Seed, oil and meat levels vary greatly'],
    ['world_moi_moi','Moi moi / steamed bean pudding (Nigeria)','🫘','Complete meal',155,9,5,200,140,280,'West Africa','Estimated','Oil, egg and fish vary'],
    ['world_suya','Beef suya (Nigeria / West Africa)','🍢','Protein',220,26,1,180,120,250,'West Africa','Estimated','Cut of beef and peanut spice vary'],
    ['world_injera','Injera (Ethiopia / Eritrea)','🫓','Starch',167,5.2,2.7,150,100,220,'East Africa','Estimated','Teff blend varies'],
    ['world_doro_wat','Doro wat chicken stew (Ethiopia)','🍗','Soup',150,14,1.5,300,220,400,'East Africa','Estimated','Butter/oil and egg vary'],
    ['world_shiro','Shiro chickpea stew (Ethiopia / Eritrea)','🫘','Beans',120,6,4,300,220,400,'East Africa','Estimated','Oil varies'],
    ['world_ugali','Ugali / maize meal (East Africa)','🥣','Starch',120,2.4,1.2,250,180,320,'East Africa','Estimated','Prepared maize meal'],
    ['world_sukuma_wiki','Sukuma wiki / cooked greens (East Africa)','🥬','Vegetables',65,3.5,4,250,180,350,'East Africa','Estimated','Cooking oil varies'],
    ['world_east_african_pilau','East African pilau rice','🍚','Complete meal',165,5,1.2,300,220,400,'East Africa','Estimated','Oil and meat vary'],
    ['world_pap','Pap / maize meal, cooked (Southern Africa)','🥣','Starch',110,2.5,1,250,180,320,'Southern Africa','Estimated','Prepared maize meal'],
    ['world_chakalaka','Chakalaka vegetable relish (South Africa)','🥘','Vegetables',85,3,4,200,140,300,'Southern Africa','Estimated','Oil and beans vary'],
    ['world_bobotie','Bobotie (South Africa)','🥘','Complete meal',180,11,1.3,300,220,400,'Southern Africa','Estimated','Meat, egg custard and fruit vary'],
    ['world_bunny_chow','Bunny chow, curry in bread (South Africa)','🍞','Complete meal',190,8,2.5,450,320,600,'Southern Africa','Estimated','Bread and curry portion vary'],

    // Latin America and Caribbean
    ['world_refried_beans','Refried beans (Mexico)','🫘','Beans',130,6.5,5,200,140,300,'Latin America & Caribbean','Estimated','Lard or oil varies'],
    ['world_taco_chicken','Chicken tacos, assembled (Mexico)','🌮','Complete meal',190,11,2.5,220,150,320,'Latin America & Caribbean','Estimated','Tortilla, toppings and sauce vary'],
    ['world_taco_beef','Beef tacos, assembled (Mexico)','🌮','Complete meal',210,11,2.5,220,150,320,'Latin America & Caribbean','Estimated','Tortilla, beef and toppings vary'],
    ['world_burrito_chicken','Chicken burrito (Mexico / US)','🌯','Complete meal',175,9,2.5,450,320,600,'Latin America & Caribbean','Estimated','Rice, beans, cheese and sauces vary'],
    ['world_quesadilla','Cheese quesadilla (Mexico)','🫓','Complete meal',280,12,2,200,140,300,'Latin America & Caribbean','Estimated','Cheese and oil vary'],
    ['world_enchiladas','Chicken enchiladas (Mexico)','🌯','Complete meal',170,10,2,350,250,450,'Latin America & Caribbean','Estimated','Cheese and sauce vary'],
    ['world_guacamole','Guacamole (Mexico)','🥑','Extras',150,2,6,80,50,120,'Latin America & Caribbean','Reference','Mostly avocado; additions vary'],
    ['world_salsa','Tomato salsa (Mexico)','🍅','Extras',35,1.5,2,80,40,150,'Latin America & Caribbean','Reference','Fresh tomato salsa'],
    ['world_arepa','Arepa, plain (Venezuela / Colombia)','🫓','Starch',215,5,3,120,80,180,'Latin America & Caribbean','Estimated','Filling should be logged separately'],
    ['world_empanada_beef','Beef empanada (Latin America)','🥟','Complete meal',260,10,2,100,70,150,'Latin America & Caribbean','Estimated','Pastry and frying/baking vary'],
    ['world_cevice','Ceviche, fish (Peru / Latin America)','🐟','Protein',95,15,1,250,180,350,'Latin America & Caribbean','Estimated','Fish, avocado and corn vary'],
    ['world_arroz_con_pollo','Arroz con pollo (Latin America)','🍛','Complete meal',165,9,1.4,350,250,450,'Latin America & Caribbean','Estimated','Oil and chicken ratio vary'],
    ['world_feijoada','Feijoada, beans and pork (Brazil)','🫘','Complete meal',145,9,5,350,250,450,'Latin America & Caribbean','Estimated','Meat cuts vary'],
    ['world_pao_queijo','Pão de queijo / cheese bread (Brazil)','🧀','Extras',330,6,1,60,40,90,'Latin America & Caribbean','Estimated','Recipe and size vary'],
    ['world_jerk_chicken','Jerk chicken, cooked (Caribbean)','🍗','Protein',190,24,0.5,220,160,300,'Latin America & Caribbean','Estimated','Skin and marinade vary'],
    ['world_rice_peas','Rice and peas (Caribbean)','🍚','Complete meal',160,5,4,250,180,350,'Latin America & Caribbean','Estimated','Coconut milk varies'],
    ['world_callaloo','Callaloo, cooked greens (Caribbean)','🥬','Vegetables',55,3,3.5,250,180,350,'Latin America & Caribbean','Estimated','Coconut milk and oil vary'],

    // North America and common fast foods
    ['world_cheeseburger','Cheeseburger (North America / Global)','🍔','Complete meal',260,13,1.5,220,160,320,'North America','Estimated','Restaurant size and sauces vary'],
    ['world_grilled_chicken_burger','Grilled chicken burger (Global)','🍔','Complete meal',210,16,1.5,240,170,330,'North America','Estimated','Bun and sauce vary'],
    ['world_hot_dog','Hot dog in bun (North America)','🌭','Complete meal',270,10,1.5,150,100,220,'North America','Estimated','Sausage and toppings vary'],
    ['world_mac_cheese','Macaroni and cheese (North America)','🧀','Complete meal',165,6,1,300,220,400,'North America','Estimated','Cheese and butter vary'],
    ['world_caesar_salad_chicken','Chicken Caesar salad (Global)','🥗','Complete meal',135,10,2,350,250,450,'North America','Estimated','Dressing, cheese and croutons vary'],
    ['world_pancakes','Pancakes, plain (Global)','🥞','Starch',227,6.5,1.3,150,100,220,'North America','Estimated','Syrup and butter should be logged separately'],
    ['world_waffles','Waffles, plain (Global)','🧇','Starch',291,8,2,120,80,180,'North America','Estimated','Toppings separate'],
    ['world_hash_browns','Hash browns (Global)','🥔','Starch',220,3,2.5,120,80,180,'North America','Estimated','Frying oil varies'],
    ['world_coleslaw','Coleslaw (Global)','🥗','Vegetables',150,1,2,120,80,180,'North America','Estimated','Mayonnaise amount varies'],

    // Additional proteins, dairy, fruit and vegetables
    ['world_pork_loin','Pork loin, cooked (Global)','🥩','Protein',196,29,0,200,150,250,'Global','Reference','Lean cooked pork'],
    ['world_pork_belly','Pork belly, cooked (Global)','🥓','Protein',518,9,0,100,60,150,'Global','Reference','Very high fat cut'],
    ['world_lamb_leg','Lamb leg, cooked lean (Global)','🍖','Protein',206,28,0,180,140,230,'Global','Reference','Cooked edible meat'],
    ['world_duck','Duck, cooked meat (Global)','🦆','Protein',201,23,0,180,130,230,'Global','Reference','Skin changes calories'],
    ['world_cod','Cod, cooked (Global)','🐟','Protein',105,23,0,220,180,280,'Global','Reference','Plain cooked'],
    ['world_haddock','Haddock, cooked (Global)','🐟','Protein',116,24,0,220,180,280,'Global','Reference','Plain cooked'],
    ['world_seabass','Sea bass, cooked (Global)','🐟','Protein',124,24,0,220,180,280,'Global','Reference','Plain cooked'],
    ['world_mussels','Mussels, cooked (Global)','🦪','Protein',172,24,0,180,120,250,'Global','Reference','Edible meat'],
    ['world_mozzarella','Mozzarella cheese (Italy / Global)','🧀','Dairy',280,28,0,50,30,80,'Europe','Reference','Check pack label'],
    ['world_feta','Feta cheese (Greece)','🧀','Dairy',264,14,0,40,25,70,'Europe','Reference','Check pack label'],
    ['world_parmesan','Parmesan cheese (Italy)','🧀','Dairy',431,38,0,20,10,35,'Europe','Reference','Hard cheese'],
    ['world_kefir','Kefir, plain (Eastern Europe / Global)','🥛','Dairy',60,3.5,0,250,150,350,'Europe','Estimated','Fat and sugar vary by brand'],
    ['world_apple','Apple (Global)','🍎','Extras',52,0.3,2.4,180,120,250,'Global','Reference','Edible weight'],
    ['world_pear','Pear (Global)','🍐','Extras',57,0.4,3.1,180,120,250,'Global','Reference','Edible weight'],
    ['world_peach','Peach (Global)','🍑','Extras',39,0.9,1.5,160,100,220,'Global','Reference','Edible weight'],
    ['world_strawberries','Strawberries (Global)','🍓','Extras',32,0.7,2,150,100,250,'Global','Reference','Fresh'],
    ['world_raspberries','Raspberries (Global)','🫐','Extras',52,1.2,6.5,120,80,200,'Global','Reference','Fresh'],
    ['world_kiwi','Kiwi fruit (Global)','🥝','Extras',61,1.1,3,150,100,220,'Global','Reference','Edible weight'],
    ['world_pomegranate','Pomegranate seeds (Global)','🔴','Extras',83,1.7,4,120,80,180,'Global','Reference','Arils only'],
    ['world_dates','Dates, dried (Middle East / Global)','🌴','Extras',282,2.5,8,35,20,60,'North Africa & Middle East','Reference','Very energy dense'],
    ['world_broccoli','Broccoli, cooked (Global)','🥦','Vegetables',35,2.4,3.3,250,150,400,'Global','Reference','Plain cooked'],
    ['world_spinach','Spinach, cooked (Global)','🥬','Vegetables',23,3,2.4,220,150,350,'Global','Reference','Plain cooked'],
    ['world_green_beans','Green beans, cooked (Global)','🫛','Vegetables',35,1.9,3.2,250,150,400,'Global','Reference','Plain cooked'],
    ['world_cauli','Cauliflower, cooked (Global)','🥦','Vegetables',23,1.8,2.3,250,150,400,'Global','Reference','Plain cooked'],
    ['world_peas','Green peas, cooked (Global)','🫛','Vegetables',84,5.4,5.5,180,120,280,'Global','Reference','Plain cooked'],
    ['world_sweetcorn','Sweetcorn, cooked (Global)','🌽','Vegetables',96,3.4,2.4,180,120,280,'Global','Reference','Plain cooked'],
    ['world_mushrooms','Mushrooms, cooked (Global)','🍄','Vegetables',28,3.6,2.2,200,120,320,'Global','Reference','Without oil'],
    ['world_zucchini','Courgette / zucchini, cooked (Global)','🥒','Vegetables',17,1.2,1.1,250,150,400,'Global','Reference','Without oil']
  ];

  const extraFoods=rows.map(r=>({id:r[0],name:r[1],emoji:r[2],cat:r[3],kcal:r[4],protein:r[5],fibre:r[6],portion:r[7],min:r[8],max:r[9],region:r[10],quality:r[11],note:r[12]}));

  try{
    const current=localStorage.getItem(KEY);
    const legacy=localStorage.getItem(LEGACY);
    const state=JSON.parse(current||legacy||'null')||{targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[]};
    state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];
    extraFoods.forEach(food=>{
      const i=state.customFoods.findIndex(f=>f&&f.id===food.id);
      if(i>=0) state.customFoods[i]={...state.customFoods[i],...food,worldLibraryVersion:LIBRARY_VERSION};
      else state.customFoods.push({...food,worldLibraryVersion:LIBRARY_VERSION});
    });
    localStorage.setItem(KEY,JSON.stringify(state));
  }catch(_){ }
})();