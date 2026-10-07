import type { Snapshot } from '../model';
import type { Recipe, RecipeIngredient } from '../recipes/model';
import { convertRecipeAmount, packageAmount } from '../recipes/units';
import { lotMatch, resolvedLots } from './resolver';
import { CapacityGraph } from './flow';

type Dimension = 'g' | 'ml' | 'count' | 'package';
interface Requirement {
  ingredient: RecipeIngredient;
  dimension: Dimension;
  demand: number;
  amounts: Map<string, number>;
}
export interface IngredientAllocation {
  used: Map<RecipeIngredient, Map<string, number>>;
  remaining: Map<string, number>;
  crossed: Set<RecipeIngredient>;
}
const cached = new WeakMap<Snapshot, WeakMap<Recipe, Map<number, IngredientAllocation>>>();
function requirement(data: Snapshot, ingredient: RecipeIngredient, scale: number): Requirement {
  if (ingredient.unit === 'package')
    return {
      ingredient,
      dimension: 'package',
      demand: ingredient.quantity * scale,
      amounts: new Map(),
    };
  const dimension = (['g', 'ml', 'count', 'package'] as const).find(
    (unit) => convertRecipeAmount(1, ingredient.unit, unit) !== undefined,
  )!;
  const amounts = new Map<string, number>();
  for (const lot of resolvedLots(data, ingredient)) {
    const food = data.foods.find((row) => row.id === lot.foodId)!;
    const amount = packageAmount(food, dimension, lot);
    if (amount !== undefined && lotMatch(data, ingredient, { food, lot }) === 'compatible')
      amounts.set(lot.id, amount);
  }
  return {
    ingredient,
    dimension,
    demand: convertRecipeAmount(ingredient.quantity * scale, ingredient.unit, dimension)!,
    amounts,
  };
}
function allocateGroup(data: Snapshot, rows: Requirement[], result: IngredientAllocation): void {
  const amounts = new Map(rows.flatMap((row) => [...row.amounts]));
  const stocks = new Map(data.stock.map((lot) => [lot.id, lot]));
  const lots = [...amounts.keys()].sort(
    (left, right) =>
      (stocks.get(left)?.expires ?? '9999').localeCompare(stocks.get(right)?.expires ?? '9999') ||
      left.localeCompare(right),
  );
  const source = lots.length + rows.length;
  const target = source + 1;
  const graph = new CapacityGraph(target + 1);
  lots.forEach((id, index) =>
    graph.connect(source, index, (result.remaining.get(id) ?? 0) * amounts.get(id)!),
  );
  const edges = rows.flatMap((row, index) => {
    const node = lots.length + index;
    graph.connect(node, target, row.demand);
    return lots.flatMap((id, lotIndex) =>
      row.amounts.has(id) ? [{ row, id, edge: graph.connect(lotIndex, node, row.demand) }] : [],
    );
  });
  graph.allocate(source, target);
  for (const { row, id, edge } of edges) {
    const packages = (edge.initial - edge.capacity) / row.amounts.get(id)!;
    if (packages <= 1e-10) continue;
    result.used.get(row.ingredient)!.set(id, packages);
    result.remaining.set(id, Math.max(0, result.remaining.get(id)! - packages));
  }
}
function buildAllocation(data: Snapshot, recipe: Recipe, servings: number): IngredientAllocation {
  const rows = recipe.ingredients.map((ingredient) =>
    requirement(data, ingredient, servings / recipe.servings),
  );
  const result: IngredientAllocation = {
    used: new Map(rows.map((row) => [row.ingredient, new Map<string, number>()])),
    remaining: new Map(data.stock.map((lot) => [lot.id, lot.quantity])),
    crossed: new Set(),
  };
  for (const row of rows) {
    if (
      rows.some(
        (other) =>
          other.dimension !== row.dimension &&
          [...row.amounts.keys()].some((id) => other.amounts.has(id)),
      )
    )
      result.crossed.add(row.ingredient);
  }
  for (const optional of [false, true]) {
    for (const dimension of ['g', 'ml', 'count', 'package'] as const) {
      const group = rows.filter(
        (row) => Boolean(row.ingredient.optional) === optional && row.dimension === dimension,
      );
      allocateGroup(data, group, result);
    }
  }
  return result;
}
export function allocateIngredients(
  data: Snapshot,
  recipe: Recipe,
  servings = recipe.servings,
): IngredientAllocation {
  let recipes = cached.get(data);
  if (!recipes) {
    recipes = new WeakMap();
    cached.set(data, recipes);
  }
  let amounts = recipes.get(recipe);
  if (!amounts) {
    amounts = new Map();
    recipes.set(recipe, amounts);
  }
  let result = amounts.get(servings);
  if (!result) {
    result = buildAllocation(data, recipe, servings);
    amounts.set(servings, result);
  }
  return result;
}
export function availableForIngredient(
  allocation: IngredientAllocation,
  ingredient: RecipeIngredient,
): Map<string, number> {
  const result = new Map(allocation.remaining);
  for (const [id, quantity] of allocation.used.get(ingredient)!)
    result.set(id, result.get(id)! + quantity);
  return result;
}
