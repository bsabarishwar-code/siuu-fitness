// All cal/p/c/f values are PER 100g (or 100ml for liquids).
// defaultGrams = typical single serving in grams/ml.

export interface FoodItem {
  id: string;
  name: string;
  cal: number;           // kcal per 100g
  p: number;             // protein g per 100g
  c: number;             // carbs g per 100g
  f: number;             // fat g per 100g
  defaultGrams: number;  // typical serving size in grams/ml
  category: string;
}

export function calcMacros(food: FoodItem, grams: number) {
  const g = Math.max(0, grams);
  return {
    cal: Math.round(food.cal * g / 100),
    p: Math.round(food.p * g / 100 * 10) / 10,
    c: Math.round(food.c * g / 100 * 10) / 10,
    f: Math.round(food.f * g / 100 * 10) / 10,
  };
}

export const FOODS: FoodItem[] = [
  // ── PROTEIN ─────────────────────────────────────────────────────────────────
  { id: 'chicken_breast',    name: 'Chicken Breast (cooked)',     cal: 165, p: 31.0, c: 0,    f: 3.6,  defaultGrams: 150, category: 'protein' },
  { id: 'chicken_thigh',     name: 'Chicken Thigh (cooked)',      cal: 209, p: 26.0, c: 0,    f: 11.0, defaultGrams: 120, category: 'protein' },
  { id: 'whole_egg',         name: 'Whole Egg',                   cal: 144, p: 12.0, c: 0.8,  f: 10.0, defaultGrams: 50,  category: 'protein' },
  { id: 'egg_white',         name: 'Egg White',                   cal: 52,  p: 10.9, c: 0.6,  f: 0.3,  defaultGrams: 33,  category: 'protein' },
  { id: 'scrambled_eggs',    name: 'Scrambled Eggs',              cal: 180, p: 12.0, c: 2.0,  f: 14.0, defaultGrams: 100, category: 'protein' },
  { id: 'tuna_canned',       name: 'Tuna (canned in water)',      cal: 116, p: 25.5, c: 0,    f: 1.0,  defaultGrams: 100, category: 'protein' },
  { id: 'salmon',            name: 'Salmon (cooked)',              cal: 208, p: 28.0, c: 0,    f: 10.0, defaultGrams: 150, category: 'protein' },
  { id: 'shrimp',            name: 'Shrimp (cooked)',              cal: 99,  p: 24.0, c: 0.2,  f: 0.3,  defaultGrams: 100, category: 'protein' },
  { id: 'turkey_breast',     name: 'Turkey Breast (cooked)',      cal: 135, p: 30.0, c: 0,    f: 1.0,  defaultGrams: 150, category: 'protein' },
  { id: 'beef_lean',         name: 'Lean Beef (cooked)',           cal: 215, p: 26.0, c: 0,    f: 12.0, defaultGrams: 150, category: 'protein' },
  { id: 'beef_sirloin',      name: 'Beef Sirloin Steak',          cal: 159, p: 24.7, c: 0,    f: 5.9,  defaultGrams: 170, category: 'protein' },
  { id: 'pork_tenderloin',   name: 'Pork Tenderloin (cooked)',    cal: 143, p: 26.0, c: 0,    f: 3.5,  defaultGrams: 113, category: 'protein' },
  { id: 'pork_chop',         name: 'Pork Chop (grilled)',         cal: 195, p: 26.5, c: 0,    f: 8.8,  defaultGrams: 113, category: 'protein' },
  { id: 'cod',               name: 'Cod (baked)',                  cal: 84,  p: 17.7, c: 0,    f: 0.7,  defaultGrams: 113, category: 'protein' },
  { id: 'tilapia',           name: 'Tilapia (baked)',              cal: 97,  p: 19.5, c: 0,    f: 2.2,  defaultGrams: 113, category: 'protein' },
  { id: 'halibut',           name: 'Halibut (baked)',              cal: 111, p: 21.2, c: 0,    f: 2.2,  defaultGrams: 113, category: 'protein' },
  { id: 'mackerel',          name: 'Mackerel (cooked)',            cal: 206, p: 18.8, c: 0,    f: 14.1, defaultGrams: 100, category: 'protein' },
  { id: 'sardines',          name: 'Sardines (canned)',            cal: 208, p: 24.6, c: 0,    f: 11.5, defaultGrams: 100, category: 'protein' },
  { id: 'scallops',          name: 'Scallops (seared)',            cal: 112, p: 20.0, c: 5.9,  f: 1.2,  defaultGrams: 85,  category: 'protein' },
  { id: 'tofu',              name: 'Tofu (firm)',                  cal: 76,  p: 8.0,  c: 1.9,  f: 4.8,  defaultGrams: 150, category: 'protein' },
  { id: 'tempeh',            name: 'Tempeh',                       cal: 193, p: 18.8, c: 9.4,  f: 10.8, defaultGrams: 85,  category: 'protein' },
  { id: 'paneer',            name: 'Paneer',                       cal: 265, p: 18.0, c: 3.4,  f: 20.0, defaultGrams: 100, category: 'protein' },
  { id: 'cottage_cheese',    name: 'Cottage Cheese',               cal: 98,  p: 11.0, c: 3.4,  f: 4.3,  defaultGrams: 200, category: 'protein' },
  { id: 'lentils_cooked',    name: 'Lentils (boiled)',             cal: 116, p: 9.0,  c: 20.0, f: 0.4,  defaultGrams: 200, category: 'protein' },
  { id: 'black_beans',       name: 'Black Beans (cooked)',         cal: 133, p: 8.8,  c: 23.7, f: 0.6,  defaultGrams: 130, category: 'protein' },
  { id: 'chickpeas',         name: 'Chickpeas (cooked)',           cal: 164, p: 8.9,  c: 27.0, f: 2.6,  defaultGrams: 150, category: 'protein' },
  { id: 'kidney_beans',      name: 'Kidney Beans (cooked)',        cal: 127, p: 8.7,  c: 22.8, f: 0.5,  defaultGrams: 130, category: 'protein' },
  { id: 'whey_protein',      name: 'Whey Protein Powder',         cal: 400, p: 80.0, c: 10.0, f: 5.0,  defaultGrams: 30,  category: 'protein' },
  { id: 'hard_boiled_egg',   name: 'Hard-Boiled Egg',             cal: 155, p: 12.6, c: 1.1,  f: 10.6, defaultGrams: 50,  category: 'protein' },

  // ── GRAIN ────────────────────────────────────────────────────────────────────
  { id: 'oats_dry',          name: 'Oats (dry)',                   cal: 379, p: 13.2, c: 67.7, f: 6.9,  defaultGrams: 80,  category: 'grain' },
  { id: 'oatmeal_cooked',    name: 'Oatmeal (cooked)',             cal: 67,  p: 2.5,  c: 11.7, f: 1.4,  defaultGrams: 240, category: 'grain' },
  { id: 'white_rice',        name: 'White Rice (cooked)',          cal: 130, p: 2.7,  c: 28.0, f: 0.3,  defaultGrams: 186, category: 'grain' },
  { id: 'brown_rice',        name: 'Brown Rice (cooked)',          cal: 110, p: 2.6,  c: 23.0, f: 0.9,  defaultGrams: 195, category: 'grain' },
  { id: 'pasta_cooked',      name: 'Pasta (cooked)',               cal: 158, p: 5.8,  c: 31.0, f: 0.9,  defaultGrams: 200, category: 'grain' },
  { id: 'quinoa_cooked',     name: 'Quinoa (cooked)',              cal: 120, p: 4.4,  c: 21.3, f: 1.9,  defaultGrams: 185, category: 'grain' },
  { id: 'whole_wheat_bread', name: 'Whole Wheat Bread',            cal: 246, p: 12.9, c: 43.1, f: 3.4,  defaultGrams: 30,  category: 'grain' },
  { id: 'white_bread',       name: 'White Bread',                  cal: 265, p: 9.0,  c: 50.6, f: 3.2,  defaultGrams: 30,  category: 'grain' },
  { id: 'chapati',           name: 'Chapati / Roti',               cal: 300, p: 7.8,  c: 55.0, f: 6.3,  defaultGrams: 40,  category: 'grain' },
  { id: 'naan',              name: 'Naan',                         cal: 291, p: 9.7,  c: 50.0, f: 5.7,  defaultGrams: 90,  category: 'grain' },
  { id: 'idli',              name: 'Idli',                         cal: 100, p: 3.8,  c: 20.5, f: 1.0,  defaultGrams: 39,  category: 'grain' },
  { id: 'dosa',              name: 'Plain Dosa',                   cal: 166, p: 5.0,  c: 30.0, f: 3.1,  defaultGrams: 80,  category: 'grain' },
  { id: 'aloo_paratha',      name: 'Aloo Paratha',                 cal: 236, p: 4.5,  c: 36.4, f: 8.2,  defaultGrams: 110, category: 'grain' },
  { id: 'poha',              name: 'Poha (cooked)',                cal: 110, p: 2.1,  c: 22.0, f: 1.2,  defaultGrams: 240, category: 'grain' },
  { id: 'cornflakes',        name: 'Corn Flakes',                  cal: 380, p: 6.7,  c: 83.3, f: 1.0,  defaultGrams: 30,  category: 'grain' },
  { id: 'sweet_potato',      name: 'Sweet Potato (baked)',         cal: 86,  p: 1.6,  c: 20.1, f: 0.1,  defaultGrams: 130, category: 'grain' },
  { id: 'boiled_potato',     name: 'Boiled Potato',                cal: 87,  p: 1.9,  c: 20.1, f: 0.1,  defaultGrams: 150, category: 'grain' },
  { id: 'barley_cooked',     name: 'Barley (cooked)',              cal: 123, p: 2.3,  c: 28.2, f: 0.4,  defaultGrams: 157, category: 'grain' },
  { id: 'millet_cooked',     name: 'Millet (cooked)',              cal: 119, p: 3.5,  c: 23.7, f: 1.0,  defaultGrams: 175, category: 'grain' },
  { id: 'pancakes',          name: 'Pancakes',                     cal: 180, p: 5.0,  c: 30.0, f: 5.0,  defaultGrams: 100, category: 'grain' },

  // ── DAIRY ────────────────────────────────────────────────────────────────────
  { id: 'whole_milk',        name: 'Whole Milk',                   cal: 62,  p: 3.3,  c: 5.0,  f: 3.3,  defaultGrams: 250, category: 'dairy' },
  { id: 'skim_milk',         name: 'Skim Milk',                    cal: 35,  p: 3.6,  c: 5.1,  f: 0.1,  defaultGrams: 250, category: 'dairy' },
  { id: 'greek_yogurt',      name: 'Greek Yogurt (full fat)',      cal: 97,  p: 9.0,  c: 3.9,  f: 5.0,  defaultGrams: 200, category: 'dairy' },
  { id: 'nonfat_greek',      name: 'Greek Yogurt (0% fat)',        cal: 59,  p: 10.0, c: 3.6,  f: 0.4,  defaultGrams: 200, category: 'dairy' },
  { id: 'curd',              name: 'Curd / Dahi',                  cal: 61,  p: 3.5,  c: 4.7,  f: 3.3,  defaultGrams: 150, category: 'dairy' },
  { id: 'cheddar_cheese',    name: 'Cheddar Cheese',               cal: 403, p: 25.0, c: 1.3,  f: 33.0, defaultGrams: 30,  category: 'dairy' },
  { id: 'mozzarella',        name: 'Mozzarella Cheese',            cal: 304, p: 22.5, c: 2.1,  f: 22.5, defaultGrams: 30,  category: 'dairy' },
  { id: 'butter',            name: 'Butter',                       cal: 717, p: 0.9,  c: 0.1,  f: 81.1, defaultGrams: 14,  category: 'dairy' },
  { id: 'ghee',              name: 'Ghee',                         cal: 900, p: 0,    c: 0,    f: 100,  defaultGrams: 14,  category: 'dairy' },
  { id: 'cream_cheese',      name: 'Cream Cheese',                 cal: 342, p: 6.2,  c: 4.1,  f: 34.4, defaultGrams: 28,  category: 'dairy' },
  { id: 'heavy_cream',       name: 'Heavy Cream',                  cal: 345, p: 2.9,  c: 2.8,  f: 37.0, defaultGrams: 30,  category: 'dairy' },
  { id: 'paneer_dairy',      name: 'Paneer (fresh)',               cal: 296, p: 18.3, c: 1.2,  f: 22.9, defaultGrams: 100, category: 'dairy' },

  // ── FRUIT ────────────────────────────────────────────────────────────────────
  { id: 'banana',            name: 'Banana',                       cal: 89,  p: 1.1,  c: 22.8, f: 0.3,  defaultGrams: 118, category: 'fruit' },
  { id: 'apple',             name: 'Apple',                        cal: 52,  p: 0.3,  c: 13.8, f: 0.2,  defaultGrams: 182, category: 'fruit' },
  { id: 'orange',            name: 'Orange',                       cal: 47,  p: 0.9,  c: 11.8, f: 0.1,  defaultGrams: 131, category: 'fruit' },
  { id: 'mango',             name: 'Mango',                        cal: 60,  p: 0.8,  c: 15.0, f: 0.4,  defaultGrams: 200, category: 'fruit' },
  { id: 'grapes',            name: 'Grapes',                       cal: 69,  p: 0.7,  c: 18.0, f: 0.2,  defaultGrams: 150, category: 'fruit' },
  { id: 'strawberries',      name: 'Strawberries',                 cal: 32,  p: 0.7,  c: 7.7,  f: 0.3,  defaultGrams: 150, category: 'fruit' },
  { id: 'blueberries',       name: 'Blueberries',                  cal: 57,  p: 0.7,  c: 14.5, f: 0.3,  defaultGrams: 148, category: 'fruit' },
  { id: 'watermelon',        name: 'Watermelon',                   cal: 30,  p: 0.6,  c: 7.6,  f: 0.2,  defaultGrams: 300, category: 'fruit' },
  { id: 'avocado',           name: 'Avocado',                      cal: 160, p: 2.0,  c: 8.5,  f: 14.7, defaultGrams: 150, category: 'fruit' },
  { id: 'papaya',            name: 'Papaya',                       cal: 43,  p: 0.5,  c: 10.8, f: 0.3,  defaultGrams: 145, category: 'fruit' },
  { id: 'kiwi',              name: 'Kiwi',                         cal: 61,  p: 1.1,  c: 14.7, f: 0.5,  defaultGrams: 76,  category: 'fruit' },
  { id: 'guava',             name: 'Guava',                        cal: 68,  p: 2.6,  c: 14.3, f: 1.0,  defaultGrams: 100, category: 'fruit' },
  { id: 'pineapple',         name: 'Pineapple',                    cal: 50,  p: 0.5,  c: 13.1, f: 0.1,  defaultGrams: 165, category: 'fruit' },
  { id: 'pomegranate',       name: 'Pomegranate (seeds)',          cal: 83,  p: 1.7,  c: 18.7, f: 1.2,  defaultGrams: 174, category: 'fruit' },
  { id: 'dates',             name: 'Dates (Medjool)',              cal: 277, p: 1.8,  c: 75.0, f: 0.2,  defaultGrams: 24,  category: 'fruit' },
  { id: 'cherries',          name: 'Cherries',                     cal: 63,  p: 1.1,  c: 16.0, f: 0.2,  defaultGrams: 138, category: 'fruit' },
  { id: 'pear',              name: 'Pear',                         cal: 57,  p: 0.4,  c: 15.2, f: 0.1,  defaultGrams: 178, category: 'fruit' },
  { id: 'peach',             name: 'Peach',                        cal: 39,  p: 0.9,  c: 9.5,  f: 0.3,  defaultGrams: 150, category: 'fruit' },

  // ── VEGETABLE ────────────────────────────────────────────────────────────────
  { id: 'broccoli',          name: 'Broccoli',                     cal: 34,  p: 2.8,  c: 6.6,  f: 0.4,  defaultGrams: 150, category: 'vegetable' },
  { id: 'spinach',           name: 'Spinach',                      cal: 23,  p: 2.9,  c: 3.6,  f: 0.4,  defaultGrams: 150, category: 'vegetable' },
  { id: 'tomato',            name: 'Tomato',                       cal: 18,  p: 0.9,  c: 3.9,  f: 0.2,  defaultGrams: 123, category: 'vegetable' },
  { id: 'carrot',            name: 'Carrot',                       cal: 41,  p: 0.9,  c: 9.6,  f: 0.2,  defaultGrams: 130, category: 'vegetable' },
  { id: 'cucumber',          name: 'Cucumber',                     cal: 16,  p: 0.7,  c: 3.6,  f: 0.1,  defaultGrams: 200, category: 'vegetable' },
  { id: 'onion',             name: 'Onion',                        cal: 40,  p: 1.1,  c: 9.3,  f: 0.1,  defaultGrams: 110, category: 'vegetable' },
  { id: 'cauliflower',       name: 'Cauliflower',                  cal: 25,  p: 2.0,  c: 5.0,  f: 0.3,  defaultGrams: 150, category: 'vegetable' },
  { id: 'green_peas',        name: 'Green Peas',                   cal: 81,  p: 5.4,  c: 14.4, f: 0.4,  defaultGrams: 160, category: 'vegetable' },
  { id: 'cabbage',           name: 'Cabbage',                      cal: 25,  p: 1.3,  c: 5.8,  f: 0.1,  defaultGrams: 150, category: 'vegetable' },
  { id: 'mushroom',          name: 'Mushrooms',                    cal: 22,  p: 3.1,  c: 3.3,  f: 0.3,  defaultGrams: 100, category: 'vegetable' },
  { id: 'bell_pepper',       name: 'Bell Pepper',                  cal: 31,  p: 1.0,  c: 7.0,  f: 0.3,  defaultGrams: 119, category: 'vegetable' },
  { id: 'beetroot',          name: 'Beetroot',                     cal: 43,  p: 1.6,  c: 9.6,  f: 0.2,  defaultGrams: 100, category: 'vegetable' },
  { id: 'green_beans',       name: 'Green Beans',                  cal: 31,  p: 1.8,  c: 7.0,  f: 0.1,  defaultGrams: 100, category: 'vegetable' },
  { id: 'kale',              name: 'Kale',                         cal: 49,  p: 4.3,  c: 8.8,  f: 0.9,  defaultGrams: 67,  category: 'vegetable' },
  { id: 'sweet_corn',        name: 'Sweet Corn (kernels)',         cal: 86,  p: 3.3,  c: 18.7, f: 1.4,  defaultGrams: 154, category: 'vegetable' },
  { id: 'asparagus',         name: 'Asparagus (steamed)',          cal: 22,  p: 2.4,  c: 4.1,  f: 0.2,  defaultGrams: 134, category: 'vegetable' },

  // ── NUT / FAT ────────────────────────────────────────────────────────────────
  { id: 'almonds',           name: 'Almonds',                      cal: 579, p: 21.2, c: 21.6, f: 49.9, defaultGrams: 28,  category: 'nut' },
  { id: 'cashews',           name: 'Cashews',                      cal: 553, p: 18.2, c: 30.2, f: 43.9, defaultGrams: 28,  category: 'nut' },
  { id: 'walnuts',           name: 'Walnuts',                      cal: 654, p: 15.2, c: 13.7, f: 65.2, defaultGrams: 28,  category: 'nut' },
  { id: 'peanuts',           name: 'Peanuts',                      cal: 567, p: 25.8, c: 16.1, f: 49.2, defaultGrams: 30,  category: 'nut' },
  { id: 'pistachios',        name: 'Pistachios',                   cal: 562, p: 20.3, c: 27.2, f: 45.4, defaultGrams: 28,  category: 'nut' },
  { id: 'mixed_nuts',        name: 'Mixed Nuts',                   cal: 607, p: 20.0, c: 21.0, f: 54.0, defaultGrams: 28,  category: 'nut' },
  { id: 'peanut_butter',     name: 'Peanut Butter',                cal: 588, p: 25.1, c: 20.1, f: 50.4, defaultGrams: 32,  category: 'nut' },
  { id: 'almond_butter',     name: 'Almond Butter',                cal: 614, p: 21.0, c: 18.8, f: 55.5, defaultGrams: 32,  category: 'nut' },
  { id: 'sunflower_seeds',   name: 'Sunflower Seeds',              cal: 584, p: 20.8, c: 20.0, f: 51.5, defaultGrams: 28,  category: 'nut' },
  { id: 'chia_seeds',        name: 'Chia Seeds',                   cal: 486, p: 16.5, c: 42.1, f: 30.7, defaultGrams: 28,  category: 'nut' },
  { id: 'flaxseeds',         name: 'Flaxseeds',                    cal: 534, p: 18.3, c: 28.9, f: 42.2, defaultGrams: 20,  category: 'nut' },
  { id: 'tahini',            name: 'Tahini',                       cal: 595, p: 17.0, c: 21.2, f: 53.8, defaultGrams: 15,  category: 'nut' },
  { id: 'hummus',            name: 'Hummus',                       cal: 177, p: 4.9,  c: 14.3, f: 9.6,  defaultGrams: 60,  category: 'nut' },
  { id: 'olive_oil',         name: 'Olive Oil',                    cal: 884, p: 0,    c: 0,    f: 100,  defaultGrams: 14,  category: 'nut' },
  { id: 'coconut_oil',       name: 'Coconut Oil',                  cal: 862, p: 0,    c: 0,    f: 100,  defaultGrams: 14,  category: 'nut' },
  { id: 'avocado_oil',       name: 'Avocado Oil',                  cal: 884, p: 0,    c: 0,    f: 100,  defaultGrams: 14,  category: 'nut' },

  // ── SNACK ────────────────────────────────────────────────────────────────────
  { id: 'dark_chocolate',    name: 'Dark Chocolate 70%',           cal: 598, p: 7.8,  c: 45.8, f: 43.1, defaultGrams: 40,  category: 'snack' },
  { id: 'protein_bar',       name: 'Protein Bar',                  cal: 367, p: 33.3, c: 36.7, f: 11.7, defaultGrams: 60,  category: 'snack' },
  { id: 'rice_cake',         name: 'Rice Cake',                    cal: 387, p: 7.8,  c: 81.1, f: 3.1,  defaultGrams: 9,   category: 'snack' },
  { id: 'roasted_chana',     name: 'Roasted Chana',                cal: 368, p: 21.4, c: 57.1, f: 7.1,  defaultGrams: 30,  category: 'snack' },
  { id: 'popcorn',           name: 'Popcorn (air-popped)',         cal: 387, p: 12.9, c: 77.9, f: 4.5,  defaultGrams: 15,  category: 'snack' },
  { id: 'granola',           name: 'Granola',                      cal: 471, p: 10.0, c: 64.0, f: 20.0, defaultGrams: 40,  category: 'snack' },
  { id: 'oat_biscuit',       name: 'Oat Biscuit',                  cal: 467, p: 8.0,  c: 59.0, f: 17.0, defaultGrams: 15,  category: 'snack' },
  { id: 'banana_chips',      name: 'Banana Chips',                 cal: 519, p: 2.3,  c: 58.4, f: 33.6, defaultGrams: 28,  category: 'snack' },

  // ── DRINK (per 100ml) ────────────────────────────────────────────────────────
  { id: 'orange_juice',      name: 'Orange Juice',                 cal: 47,  p: 0.7,  c: 10.8, f: 0.2,  defaultGrams: 250, category: 'drink' },
  { id: 'coconut_water',     name: 'Coconut Water',                cal: 19,  p: 0.7,  c: 3.7,  f: 0.2,  defaultGrams: 250, category: 'drink' },
  { id: 'buttermilk',        name: 'Buttermilk / Chaas',           cal: 22,  p: 1.5,  c: 2.5,  f: 0.6,  defaultGrams: 250, category: 'drink' },
  { id: 'lassi_sweet',       name: 'Sweet Lassi',                  cal: 79,  p: 2.5,  c: 12.9, f: 2.1,  defaultGrams: 250, category: 'drink' },
  { id: 'mango_lassi',       name: 'Mango Lassi',                  cal: 85,  p: 2.3,  c: 15.4, f: 1.7,  defaultGrams: 250, category: 'drink' },
  { id: 'milk_coffee',       name: 'Coffee with Milk & Sugar',     cal: 25,  p: 1.0,  c: 3.5,  f: 0.8,  defaultGrams: 250, category: 'drink' },
  { id: 'whole_milk_latte',  name: 'Whole Milk Latte',             cal: 79,  p: 3.3,  c: 7.9,  f: 2.9,  defaultGrams: 240, category: 'drink' },
  { id: 'sports_drink',      name: 'Sports Drink (Gatorade)',      cal: 22,  p: 0,    c: 5.8,  f: 0,    defaultGrams: 500, category: 'drink' },
  { id: 'green_tea',         name: 'Green Tea',                    cal: 1,   p: 0,    c: 0.5,  f: 0,    defaultGrams: 300, category: 'drink' },
  { id: 'black_coffee',      name: 'Black Coffee',                 cal: 2,   p: 0.3,  c: 0,    f: 0.1,  defaultGrams: 240, category: 'drink' },
  { id: 'protein_shake',     name: 'Protein Shake (ready-made)',   cal: 50,  p: 5.0,  c: 7.0,  f: 0.8,  defaultGrams: 350, category: 'drink' },
  { id: 'smoothie_fruit',    name: 'Fruit Smoothie',               cal: 60,  p: 2.0,  c: 14.0, f: 0.5,  defaultGrams: 300, category: 'drink' },

  // ── INDIAN ───────────────────────────────────────────────────────────────────
  { id: 'dal_tadka',         name: 'Dal Tadka',                    cal: 92,  p: 5.0,  c: 13.0, f: 2.5,  defaultGrams: 200, category: 'indian' },
  { id: 'chole',             name: 'Chole / Chana Masala',         cal: 164, p: 8.9,  c: 27.4, f: 2.6,  defaultGrams: 200, category: 'indian' },
  { id: 'rajma_curry',       name: 'Rajma Curry',                  cal: 140, p: 8.7,  c: 22.0, f: 2.0,  defaultGrams: 200, category: 'indian' },
  { id: 'sambar',            name: 'Sambar',                       cal: 55,  p: 2.6,  c: 7.6,  f: 1.7,  defaultGrams: 200, category: 'indian' },
  { id: 'chicken_biryani',   name: 'Chicken Biryani',              cal: 180, p: 10.0, c: 25.0, f: 5.0,  defaultGrams: 250, category: 'indian' },
  { id: 'veg_biryani',       name: 'Veg Biryani',                  cal: 150, p: 4.0,  c: 28.0, f: 3.5,  defaultGrams: 250, category: 'indian' },
  { id: 'paneer_butter_masala', name: 'Paneer Butter Masala',      cal: 183, p: 9.0,  c: 9.0,  f: 13.0, defaultGrams: 200, category: 'indian' },
  { id: 'palak_paneer',      name: 'Palak Paneer',                 cal: 152, p: 8.0,  c: 8.0,  f: 10.0, defaultGrams: 200, category: 'indian' },
  { id: 'dal_makhani',       name: 'Dal Makhani',                  cal: 130, p: 6.0,  c: 16.0, f: 5.0,  defaultGrams: 200, category: 'indian' },
  { id: 'upma',              name: 'Upma',                         cal: 100, p: 2.5,  c: 18.0, f: 2.0,  defaultGrams: 240, category: 'indian' },
  { id: 'egg_bhurji',        name: 'Egg Bhurji',                   cal: 185, p: 12.0, c: 5.0,  f: 13.0, defaultGrams: 150, category: 'indian' },
  { id: 'medu_vada',         name: 'Medu Vada',                    cal: 300, p: 8.0,  c: 38.0, f: 13.0, defaultGrams: 50,  category: 'indian' },
  { id: 'puri',              name: 'Puri',                         cal: 329, p: 7.1,  c: 48.6, f: 17.1, defaultGrams: 35,  category: 'indian' },
  { id: 'masala_dosa',       name: 'Masala Dosa',                  cal: 179, p: 4.4,  c: 29.4, f: 5.0,  defaultGrams: 160, category: 'indian' },
  { id: 'pav_bhaji',         name: 'Pav Bhaji',                    cal: 150, p: 4.0,  c: 25.0, f: 4.5,  defaultGrams: 200, category: 'indian' },
  { id: 'khichdi',           name: 'Khichdi',                      cal: 120, p: 5.0,  c: 22.0, f: 1.5,  defaultGrams: 250, category: 'indian' },
  { id: 'aloo_sabzi',        name: 'Aloo Sabzi',                   cal: 98,  p: 2.0,  c: 17.0, f: 3.0,  defaultGrams: 200, category: 'indian' },
  { id: 'chicken_curry',     name: 'Chicken Curry',                cal: 175, p: 15.0, c: 5.0,  f: 11.0, defaultGrams: 200, category: 'indian' },
  { id: 'fish_curry',        name: 'Fish Curry',                   cal: 140, p: 14.0, c: 6.0,  f: 7.0,  defaultGrams: 200, category: 'indian' },
  { id: 'masala_chai',       name: 'Masala Chai (with milk)',      cal: 27,  p: 0.6,  c: 4.2,  f: 0.8,  defaultGrams: 240, category: 'indian' },
];

export function searchFoods(query: string): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return FOODS.slice(0, 25);
  return FOODS.filter(f =>
    f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  ).slice(0, 20);
}
