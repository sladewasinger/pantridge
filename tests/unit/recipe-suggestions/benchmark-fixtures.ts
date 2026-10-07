import { emptySnapshot, type Food, type Snapshot } from '../../../src/domain/model';
import { benchmarkFoodNames as names } from '../../../src/development/sample-names';

export function recipeBenchmarkKitchen(count: 10 | 40 | 200): Snapshot {
  if (names.length < count) throw new Error('Not enough distinct recognized benchmark foods.');
  const foods: Food[] = names.slice(0, count).map((name, index) => ({
    id: `bb010000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name,
    kind: 'food',
    unit: 'packs',
    art: 'rice',
    brand: '',
    packageSize: '500 g',
    size: { amount: 500, measure: 'g', packs: 1 },
    location: 'pantry',
    shelf: 0,
    frozen: name.startsWith('Frozen '),
  }));
  return {
    ...emptySnapshot(),
    foods,
    stock: foods.map((food, index) => ({
      id: `bb020000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      foodId: food.id,
      quantity: 1,
    })),
  };
}
