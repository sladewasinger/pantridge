import { artwork, type ArtId } from '../domain/artwork/catalog';
import { matchArtwork } from '../domain/artwork/match';
import { snapshotSchema, type Food, type Snapshot } from '../domain/model';
import { sizeLabel } from '../domain/products/size';
import { sampleFoodNames } from './sample-names';

const fallbackArt: [RegExp, ArtId][] = [
  [/rice/i, 'rice'],
  [/beans/i, 'can'],
  [/pasta|linguine|fettuccine|fusilli|rigatoni|noodles/i, 'pasta'],
  [/lentils|barley|bulgur|couscous/i, 'lentils'],
  [/milk/i, 'milk'],
  [/vinegar/i, 'vinegar'],
  [/arugula|cabbage|asparagus|eggplant|green beans/i, 'greens'],
  [/cheese|parmesan|feta|ricotta/i, 'cheddar'],
  [/yogurt/i, 'yogurt'],
  [/beef|pork|turkey|ham|seitan|tempeh/i, 'ground-beef'],
  [/salmon|cod|shrimp/i, 'fish'],
  [/almonds|walnuts|peanuts|cashews|seeds/i, 'nuts'],
  [/oil|juice|wine|syrup|extract/i, 'plain-bottle'],
  [
    /salt|pepper|powder|paprika|cumin|cinnamon|herbs|basil|oregano|thyme|rosemary|parsley|cilantro|ginger|turmeric|zest|yeast|cornstarch/i,
    'plain-jar',
  ],
];
function sampleArt(name: string): ArtId {
  return (
    matchArtwork(name) ?? fallbackArt.find(([pattern]) => pattern.test(name))?.[1] ?? 'generic'
  );
}
const perishable =
  /beef|pork|turkey|ham|seitan|tempeh|salmon|cod|shrimp|parmesan|feta|ricotta|cream|milk|yogurt|arugula|cabbage|asparagus|eggplant|cherries|peaches|pears|mango|kiwi|plums|cilantro|parsley/i;
function sampleFood(name: string, index: number): Food {
  const art = sampleArt(name);
  const group = artwork.find((entry) => entry.id === art)!.group;
  const frozen = name.startsWith('Frozen ') || group === 'Freezer';
  const pantry = /^(canned|dried)\b/i.test(name) || /coconut milk|broth/i.test(name);
  const location = !pantry && (perishable.test(name) || group === 'Fridge') ? 'fridge' : 'pantry';
  const size: NonNullable<Food['size']> = {
    amount: name === 'Eggs' ? 12 : 500,
    measure:
      name === 'Eggs'
        ? 'count'
        : /milk|broth|juice|oil|vinegar|wine|^(heavy )?cream$/i.test(name)
          ? 'ml'
          : 'g',
    packs: 1,
  };
  return {
    id: `bb030000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name,
    kind: 'food',
    art,
    unit: size.measure === 'ml' ? 'bottles' : name === 'Eggs' ? 'cartons' : 'packs',
    brand: '',
    packageSize: sizeLabel(size),
    size,
    location,
    frozen,
    shelf: 0,
  };
}
// Synthetic packages for UI testing; existing names and quantities are preserved.
export function addSampleFoods(data: Snapshot): Snapshot {
  const existing = new Set(data.foods.map((food) => food.name.toLowerCase()));
  const foods = sampleFoodNames
    .map(sampleFood)
    .filter((food) => !existing.has(food.name.toLowerCase()));
  return snapshotSchema.parse({
    ...data,
    foods: [...data.foods, ...foods],
    stock: [
      ...data.stock,
      ...foods.map((food, index) => ({
        id: food.id.replace('bb030000', 'bb040000'),
        foodId: food.id,
        quantity: [1, 2, 0.75, 1.5][index % 4],
      })),
    ],
  });
}
