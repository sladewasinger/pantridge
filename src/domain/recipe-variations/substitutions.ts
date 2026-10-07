import type { Recipe, RecipeIngredient } from '../recipes/model';
import type { Food } from '../model';
import { suggestionGroup } from '../recipe-suggestions/groups';
import { normalizeIngredientName } from '../recipes/names';
import type { RecipeVariation } from './model';

type Candidate = Pick<Food, 'name' | 'id' | 'frozen'>;
function familyReplacement(item: RecipeIngredient, food: Candidate) {
  const source = suggestionGroup({ name: item.name, frozen: false });
  const target = suggestionGroup(food);
  if (source.name !== target.name || !/\b(beans|rice|pasta)\b/i.test(source.name)) return undefined;
  if (/beans/i.test(source.name) && !/^(canned|cooked|dried|raw) /i.test(source.name))
    return undefined;
  if (item.unit === 'count' || item.unit === 'package') return undefined;
  const cooked = /^cooked /i.test(source.name);
  const brown = !cooked && /brown/i.test(food.name) && !/brown/i.test(item.name);
  return {
    quantity: item.quantity,
    minutes: brown ? 25 : 0,
    preparation: cooked
      ? `Use the same measure of ${food.name} and reheat it with the meal. No additional grain cooking time is needed.`
      : /rice|pasta/i.test(source.name)
        ? `Use ${food.name}'s package water ratio and cooking time${brown ? '; allow about 25 extra minutes, depending on the variety' : ''}.`
        : `Keep the same ${item.unit} amount and ${source.name.toLowerCase()} preparation; flavor and texture differ.`,
  };
}
function specialReplacement(recipe: Recipe, item: RecipeIngredient, food: Candidate) {
  if (item.unit === 'count' || item.unit === 'package') return undefined;
  if (/bake|baking|cake|bread|pastry|cookie|muffin/i.test(recipe.title + recipe.steps.join(' ')))
    return undefined;
  if (
    /^butter$/i.test(item.name) &&
    /^olive oil$/i.test(food.name) &&
    /melt|saut[eé]|fry|pan/i.test(recipe.steps.join(' '))
  )
    return {
      quantity: item.quantity * 0.75,
      minutes: 0,
      preparation:
        'Warm the oil in the pan before adding other ingredients; flavor will be less buttery. For stovetop use only.',
    };
  if (/^milk$/i.test(item.name) && /^unsweetened (soy|oat) milk$/i.test(food.name))
    return {
      quantity: item.quantity,
      minutes: 0,
      preparation:
        'Use the same measure; choose an unsweetened product and heat gently. The flavor and thickness may differ.',
    };
  if (/^(pasta|spaghetti|penne)$/i.test(item.name) && /^gluten-free pasta$/i.test(food.name))
    return {
      quantity: item.quantity,
      minutes: 0,
      preparation:
        'Check the package ingredients and cooking time; cook separately and avoid overcooking.',
    };
  return undefined;
}
export function substitutionOptions(recipe: Recipe, foods: Food[]): RecipeVariation[] {
  const extras: Candidate[] = [
    'Olive oil',
    'Unsweetened oat milk',
    'Gluten-free pasta',
    'Canned pinto beans',
    'Canned black beans',
    'Cooked pinto beans',
    'Cooked black beans',
  ]
    .filter(
      (name) =>
        !foods.some((food) => normalizeIngredientName(food.name) === normalizeIngredientName(name)),
    )
    .map((name) => ({ id: `alternative:${name}`, name, frozen: false }));
  return recipe.ingredients.flatMap((item) =>
    [...foods, ...extras]
      .flatMap((food) => {
        if (normalizeIngredientName(food.name) === normalizeIngredientName(item.name)) return [];
        const change = familyReplacement(item, food) ?? specialReplacement(recipe, item, food);
        if (!change) return [];
        return [
          {
            id: `swap:${item.id}:${food.id}`,
            label: `${item.name} → ${food.name}`,
            why: 'An available alternative with a similar role.',
            preparation: change.preparation,
            ingredient: {
              ...item,
              name: food.name,
              quantity: Math.round(change.quantity * 1000000) / 1000000,
              note: change.preparation.slice(0, 240),
            },
            replaces: item.id,
            minutes: change.minutes,
            stocked: !food.id.startsWith('alternative:'),
          },
        ];
      })
      .slice(0, 2),
  );
}
