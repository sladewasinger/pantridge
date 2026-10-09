import type { Mutation, Command } from '../commands';
import type { Snapshot, Food, ShoppingItem } from '../model';
import type { Recipe } from '../recipes/model';
import type { IngredientIdentity } from './model';
import type { SavedStandardization, Evidence } from '../standardization/model';
import { foodEvidence, recipeEvidence, evidenceFingerprint } from '../standardization/evidence';
import { catalogRevision, knownInCatalog } from './catalog-version';

interface Classified {
  ingredient?: IngredientIdentity;
  standardization?: SavedStandardization;
}
function preserve<T extends Classified>(
  before: T | undefined,
  after: T,
  revision: number,
  same: boolean,
): T {
  if (!before || !same) return after;
  // An old save cannot acknowledge a descriptor its originating app could not
  // decode. Preserve it even when the save carries an older, different descriptor.
  return {
    ...after,
    ...(before.ingredient && !knownInCatalog(before.ingredient.id, revision)
      ? { ingredient: before.ingredient }
      : {}),
    ...(before.standardization?.identity &&
    !knownInCatalog(before.standardization.identity, revision)
      ? { standardization: before.standardization }
      : {}),
  };
}
const sameEvidence = (before: Evidence, after: Evidence) =>
  evidenceFingerprint(before) === evidenceFingerprint(after);
function preserveFood(data: Snapshot, food: Food, revision: number) {
  const previous = data.foods.find((item) => item.id === food.id);
  return preserve(
    previous,
    food,
    revision,
    Boolean(previous && sameEvidence(foodEvidence(previous), foodEvidence(food))),
  );
}
function preserveRecipe(data: Snapshot, recipe: Recipe, revision: number): Recipe {
  const previous = data.recipes?.find((item) => item.id === recipe.id);
  if (!previous) return recipe;
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((item) => {
      const old = previous.ingredients.find((row) => row.id === item.id);
      return preserve(
        old,
        item,
        revision,
        Boolean(old && sameEvidence(recipeEvidence(old), recipeEvidence(item))),
      );
    }),
  };
}
function preserveShopping(data: Snapshot, item: ShoppingItem, revision: number) {
  const previous = data.shopping.find((row) => row.id === item.id);
  const name = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const same = Boolean(
    previous && previous.foodId === item.foodId && name(previous.name) === name(item.name),
  );
  return preserve(previous, item, revision, same);
}
export function compatibleMutationCommand(data: Snapshot, mutation: Mutation): Command {
  const revision = mutation.catalogRevision ?? 1;
  const command = mutation.command;
  if (revision >= catalogRevision) return command;
  switch (command.type) {
    case 'food.save':
    case 'shopping.putAway':
      return { ...command, food: preserveFood(data, command.food, revision) };
    case 'recipe.save':
      return { ...command, recipe: preserveRecipe(data, command.recipe, revision) };
    case 'shopping.save':
      return { ...command, item: preserveShopping(data, command.item, revision) };
    default:
      return command;
  }
}
