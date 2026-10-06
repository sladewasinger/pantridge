import { recipeSchema, type Recipe } from './model';
import { parseIngredient } from './import-ingredient';
import { findRecipe, instructionLines, sourceUrl } from './import-source';

interface ImportOptions {
  id: string;
  ingredientId: (index: number) => string;
  source?: string;
}
function textRecipe(text: string, options: ImportOptions): Recipe {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines.shift();
  const ingredientsAt = lines.findIndex((line) => /^ingredients:?$/i.test(line));
  const stepsAt = lines.findIndex((line) =>
    /^(?:instructions|directions|method|steps):?$/i.test(line),
  );
  if (!title || ingredientsAt < 0 || stepsAt <= ingredientsAt)
    throw new Error(
      'Paste a title, an Ingredients heading with amounts, then a Steps heading with directions.',
    );
  const servingLine = lines.find((line) => /^servings:\s*\d+$/i.test(line));
  return recipeSchema.parse({
    id: options.id,
    title,
    source: 'import',
    servings: servingLine ? Number(servingLine.split(':')[1]) : 2,
    ingredients: lines
      .slice(ingredientsAt + 1, stepsAt)
      .map((line, index) => parseIngredient(line, options.ingredientId(index))),
    steps: lines.slice(stepsAt + 1).map((line) => line.replace(/^\d+[.)]\s*/, '')),
    sourceUrl: sourceUrl(options.source),
  });
}
function jsonLdRecipe(item: Record<string, unknown>, options: ImportOptions): Recipe {
  if (!Array.isArray(item.recipeIngredient)) throw new Error('This recipe has no ingredient list.');
  const ingredients = item.recipeIngredient.map((line, index) => {
    if (typeof line !== 'string') throw new Error('Recipe ingredients must be text lines.');
    return parseIngredient(line, options.ingredientId(index));
  });
  const yieldText = Array.isArray(item.recipeYield) ? item.recipeYield[0] : item.recipeYield;
  const servings = /^\s*(\d+)\s*(?:servings?|portions?)?\s*$/i.exec(String(yieldText ?? ''))?.[1];
  return recipeSchema.parse({
    id: options.id,
    title: item.name,
    description: typeof item.description === 'string' ? item.description : undefined,
    servings: servings ? Number(servings) : 2,
    source: 'import',
    ingredients,
    steps: instructionLines(item.recipeInstructions),
    sourceUrl: sourceUrl(options.source || item.url),
  });
}
function appRecipe(item: Record<string, unknown>, options: ImportOptions): Recipe {
  const ingredients = Array.isArray(item.ingredients)
    ? item.ingredients.map((entry: unknown, index: number) => {
        if (!entry || typeof entry !== 'object')
          throw new Error('Recipe ingredients need names, quantities, and units.');
        return { ...entry, id: options.ingredientId(index) };
      })
    : [];
  return recipeSchema.parse({
    ...item,
    id: options.id,
    ingredients,
    source: 'import',
    sourceUrl: sourceUrl(options.source || item.sourceUrl),
  });
}
/** Imports stay local and untrusted. Text is never executed or rendered as HTML. */
export function importRecipe(text: string, options: ImportOptions): Recipe {
  if (text.length > 50_000) throw new Error('Paste a recipe under 50,000 characters.');
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return textRecipe(trimmed, options);
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    throw new Error('The recipe JSON is incomplete. Check it and try again.');
  }
  const linked = findRecipe(value);
  if (linked) return jsonLdRecipe(linked, options);
  if (value && typeof value === 'object' && !Array.isArray(value))
    return appRecipe(value as Record<string, unknown>, options);
  throw new Error('No Recipe was found in this JSON.');
}
