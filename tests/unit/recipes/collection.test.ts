import { describe, expect, it } from 'vitest';
import { recipeSchema } from '../../../src/domain/recipes/model';
import { curatedRecipes } from '../../../src/domain/recipes/collection';
import { starterRecipes } from '../../../src/domain/recipes/starters';
import { getCookbookRecipes } from '../../../src/domain/recipes/selectors';
import { browseRecipes } from '../../../src/domain/recipes/browse';
import { parseRecipeDraft, recipeDraft } from '../../../src/features/cookbook/editorState';
import { recipe, stockedKitchen } from './fixtures';

const options = { builtIns: false, quickOnly: false, order: 'use-soon' as const };
const today = '2026-10-06';
describe('curated cookbook', () => {
  it('adds 100 attributed, rated recipes without replacing the original four identities', () => {
    expect(starterRecipes).toHaveLength(104);
    expect(curatedRecipes).toHaveLength(100);
    expect(new Set(starterRecipes.map((item) => item.id)).size).toBe(104);
    expect(starterRecipes.slice(0, 4).map((item) => item.title)).toEqual([
      'Simple scrambled eggs',
      'Black beans and rice',
      'Tomato pasta',
      'Vegetable fried rice',
    ]);
    for (const item of curatedRecipes) {
      expect(recipeSchema.safeParse(item).success).toBe(true);
      expect(item.curation?.rating).toBeGreaterThanOrEqual(4.5);
      expect(item.curation?.ratingCount).toBeGreaterThanOrEqual(100);
      expect(item.curation?.checkedAt).toBe(today);
      expect(item.sourceUrl).toMatch(/^https:\/\/www\.(spendwithpennies|budgetbytes)\.com\//);
      expect(item.nutrition?.calories).toBeGreaterThan(0);
      expect(item.nutrition?.sodium).toBeDefined();
    }
  });
  it('retains container weights, cooked identities and unmeasured extras', () => {
    const soup = curatedRecipes.find(
      (item) => item.title === 'Easy Rosemary Garlic White Bean Soup',
    )!;
    expect(soup.ingredients.find((item) => item.name === 'Cannellini beans')).toMatchObject({
      quantity: 45,
      unit: 'oz',
    });
    expect(soup.ingredients.find((item) => item.name === 'Vegetable broth')).toMatchObject({
      quantity: 2,
      unit: 'cup',
    });
    expect(soup.untrackedIngredients).toContain('1 pinch crushed red pepper');
    const salad = curatedRecipes.find((item) => item.title === 'Classic Chicken Salad')!;
    expect(salad.ingredients[0]?.name).toBe('Cooked chicken');
    const garlic = curatedRecipes.find((item) => item.title === 'Creamy Garlic Chicken')!;
    expect(garlic.ingredients.find((item) => item.name === 'Garlic bulb')).toMatchObject({
      quantity: 1,
      unit: 'count',
    });
  });
  it('does not invent missing nutrition, and removes publisher estimates after editing', () => {
    const chicken = curatedRecipes.find((item) => item.title === 'Baked Chicken Breast')!;
    expect(chicken.nutrition?.carbohydrate).toBeUndefined();
    const original = curatedRecipes.find((item) => item.untrackedIngredients?.length)!;
    const draft = recipeDraft(original);
    draft.title = 'My version';
    const edited = parseRecipeDraft(draft, original, original.id);
    expect(edited.nutrition).toBeUndefined();
    expect(edited.curation).toBeUndefined();
    expect(edited.untrackedIngredients).toEqual(original.untrackedIngredients);
    draft.extras = '';
    expect(parseRecipeDraft(draft, original, original.id).untrackedIngredients).toBeUndefined();
    expect(
      recipeSchema.safeParse({ ...original, nutrition: { ...original.nutrition, sodium: -1 } })
        .success,
    ).toBe(false);
  });
});
describe('recipe browsing', () => {
  it('prioritizes the nearest upcoming ingredient date, ignoring past dates and zero lots', () => {
    const data = stockedKitchen();
    const second = {
      ...recipe,
      id: crypto.randomUUID(),
      title: 'Later rice',
      ingredients: [{ ...recipe.ingredients[0]!, name: 'Rice' }],
    };
    data.recipes = [second, { ...recipe, title: 'Egg supper' }];
    data.foods.push({ ...data.foods[0]!, id: crypto.randomUUID(), name: 'Rice' });
    data.stock[0]!.expires = '2026-10-07';
    data.stock.push({
      id: crypto.randomUUID(),
      foodId: data.foods[1]!.id,
      quantity: 1,
      expires: '2026-10-10',
    });
    const before = structuredClone(data);
    expect(browseRecipes(data, '', options, today).map((item) => item.recipe.title)).toEqual([
      'Egg supper',
      'Later rice',
    ]);
    expect(data).toEqual(before);
    data.stock[0]!.expires = '2026-10-05';
    expect(browseRecipes(data, '', options, today)[0]?.recipe.title).toBe('Later rice');
    data.stock[0]!.expires = '2026-10-06';
    data.stock[0]!.quantity = 0;
    expect(browseRecipes(data, '', options, today)[0]?.recipe.title).toBe('Later rice');
  });
  it('hides unsaved built-ins, retains saved copies and searches ingredients with quick filtering', () => {
    const data = stockedKitchen();
    const saved = { ...curatedRecipes[0]!, title: 'My casserole' };
    data.recipes = [recipe, saved];
    expect(browseRecipes(data, '', options, today)).toHaveLength(2);
    expect(getCookbookRecipes(data).filter((item) => item.id === saved.id)).toEqual([saved]);
    data.recipes = [
      { ...recipe, minutes: 10 },
      { ...saved, minutes: 90 },
    ];
    expect(
      browseRecipes(data, 'egg', { ...options, quickOnly: true }, today).map(
        (item) => item.recipe.id,
      ),
    ).toEqual([recipe.id]);
    expect(browseRecipes(data, '', { ...options, order: 'quick' }, today)[0]?.recipe.id).toBe(
      recipe.id,
    );
  });
});
