import { emptySnapshot, type Food, type Snapshot } from '../../src/domain/model';

// Synthetic reproduction of the visible shelf names, never a live kitchen export.
export function recipeRankingKitchen(): Snapshot {
  const names = [
    'Toilet paper',
    'Beer',
    'Eggs',
    'Potatoes',
    'Raspberries',
    'Black Beans (Unsalted)',
    'Brown Rice',
    'Brown Rice',
    'Chipotle pepper sauce',
    'Cinnamon Life Cereal',
    'Fingerling Potatoes',
    'Oats & Honey Protein Granola',
    'Raw Unfiltered Colorado Honey Blend',
    'Red onion',
    'Sardines in olive oil',
    'Smoked Oysters',
    'Spinach',
    'Sundried Tomato and Basil Wheat Crackers',
    'Tabasco',
    'Ground Beef',
  ];
  const foods: Food[] = names.map((name, index) => ({
    id: `cb200000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name,
    unit: 'items',
    art: index === 0 ? 'household-box' : 'eggs',
    kind: index === 0 ? 'supply' : 'food',
    brand: '',
    packageSize: '',
    location: 'pantry',
    shelf: 0,
    frozen: false,
  }));
  foods[2] = { ...foods[2]!, unit: 'cartons', size: { amount: 12, measure: 'count', packs: 1 } };
  foods[5] = { ...foods[5]!, unit: 'cans', size: { amount: 432, measure: 'g', packs: 1 } };
  foods[7] = { ...foods[7]!, unit: 'bags', size: { amount: 250, measure: 'g', packs: 1 } };
  foods[19] = { ...foods[19]!, size: { amount: 16, measure: 'oz', packs: 1 }, frozen: true };
  return {
    ...emptySnapshot(),
    starterVersion: 1,
    foods,
    stock: foods.map((food, index) => ({
      id: `cb210000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      foodId: food.id,
      quantity: index === 2 ? 2 : index === 3 ? 6 : index === 10 ? 4 : 1,
    })),
  };
}
