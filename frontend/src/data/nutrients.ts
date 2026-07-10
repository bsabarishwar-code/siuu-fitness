export type NutrientCategory = 'vitamins' | 'minerals' | 'essentialFats' | 'fiber';

export interface Nutrient {
  id: string;
  name: string;
  unit: string;
  rda: number;
  category: NutrientCategory;
  alias?: string;
}

export const NUTRIENTS: Nutrient[] = [
  // Vitamins
  { id: 'vit_a',   name: 'Vitamin A',       unit: 'mcg', rda: 900,   category: 'vitamins' },
  { id: 'vit_b1',  name: 'Vitamin B1',      unit: 'mg',  rda: 1.2,   category: 'vitamins', alias: 'Thiamine' },
  { id: 'vit_b2',  name: 'Vitamin B2',      unit: 'mg',  rda: 1.3,   category: 'vitamins', alias: 'Riboflavin' },
  { id: 'vit_b3',  name: 'Vitamin B3',      unit: 'mg',  rda: 16,    category: 'vitamins', alias: 'Niacin' },
  { id: 'vit_b5',  name: 'Vitamin B5',      unit: 'mg',  rda: 5,     category: 'vitamins', alias: 'Pantothenic Acid' },
  { id: 'vit_b6',  name: 'Vitamin B6',      unit: 'mg',  rda: 1.7,   category: 'vitamins' },
  { id: 'vit_b7',  name: 'Vitamin B7',      unit: 'mcg', rda: 30,    category: 'vitamins', alias: 'Biotin' },
  { id: 'vit_b9',  name: 'Vitamin B9',      unit: 'mcg', rda: 400,   category: 'vitamins', alias: 'Folate' },
  { id: 'vit_b12', name: 'Vitamin B12',     unit: 'mcg', rda: 2.4,   category: 'vitamins' },
  { id: 'vit_c',   name: 'Vitamin C',       unit: 'mg',  rda: 90,    category: 'vitamins' },
  { id: 'vit_d',   name: 'Vitamin D',       unit: 'mcg', rda: 20,    category: 'vitamins' },
  { id: 'vit_e',   name: 'Vitamin E',       unit: 'mg',  rda: 15,    category: 'vitamins' },
  { id: 'vit_k',   name: 'Vitamin K',       unit: 'mcg', rda: 120,   category: 'vitamins' },
  // Minerals
  { id: 'calcium',    name: 'Calcium',     unit: 'mg',  rda: 1000, category: 'minerals' },
  { id: 'iron',       name: 'Iron',        unit: 'mg',  rda: 8,    category: 'minerals' },
  { id: 'magnesium',  name: 'Magnesium',   unit: 'mg',  rda: 420,  category: 'minerals' },
  { id: 'zinc',       name: 'Zinc',        unit: 'mg',  rda: 11,   category: 'minerals' },
  { id: 'potassium',  name: 'Potassium',   unit: 'mg',  rda: 3500, category: 'minerals' },
  { id: 'sodium',     name: 'Sodium',      unit: 'mg',  rda: 2300, category: 'minerals' },
  { id: 'phosphorus', name: 'Phosphorus',  unit: 'mg',  rda: 700,  category: 'minerals' },
  { id: 'selenium',   name: 'Selenium',    unit: 'mcg', rda: 55,   category: 'minerals' },
  { id: 'copper',     name: 'Copper',      unit: 'mg',  rda: 0.9,  category: 'minerals' },
  { id: 'manganese',  name: 'Manganese',   unit: 'mg',  rda: 2.3,  category: 'minerals' },
  { id: 'iodine',     name: 'Iodine',      unit: 'mcg', rda: 150,  category: 'minerals' },
  { id: 'chromium',   name: 'Chromium',    unit: 'mcg', rda: 35,   category: 'minerals' },
  // Essential Fats
  { id: 'omega3_dha', name: 'Omega-3 DHA', unit: 'mg', rda: 250, category: 'essentialFats' },
  { id: 'omega3_epa', name: 'Omega-3 EPA', unit: 'mg', rda: 250, category: 'essentialFats' },
  // Fiber
  { id: 'fiber', name: 'Dietary Fiber', unit: 'g', rda: 38, category: 'fiber' },
];

export const NUTRIENT_BY_ID = new Map(NUTRIENTS.map(n => [n.id, n]));

export const CATEGORY_LABELS: Record<NutrientCategory, string> = {
  vitamins:      'VITAMINS',
  minerals:      'MINERALS',
  essentialFats: 'ESSENTIAL FATS',
  fiber:         'FIBER',
};

export function getNutrientsByCategory(cat: NutrientCategory): Nutrient[] {
  return NUTRIENTS.filter(n => n.category === cat);
}
