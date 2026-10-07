import { useState } from 'react';
import { BookOpen, FileInput, Plus } from 'lucide-react';
import { useKitchen } from '../../data/store';
import { getCookbookRecipes, getRecipes } from '../../domain/recipes/selectors';
import { getRecipeAvailability } from '../../domain/recipes/availability';
import { RecipeCard } from './RecipeCard';
import { RecipeIndex } from './RecipeIndex';
import { MealPlanList } from './MealPlanList';
import { todayLocal } from './presentation';

export function Cookbook({
  query,
  onOpen,
  onAdd,
  onImport,
  onSuggest,
}: {
  query: string;
  onOpen: (id: string, planEntryId?: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onSuggest: () => void;
}) {
  const { data } = useKitchen();
  const [mode, setMode] = useState<'inventory' | 'use-up' | 'saved' | 'all'>('inventory');
  const saved = new Set(getRecipes(data).map((recipe) => recipe.id));
  const recipes = getCookbookRecipes(data)
    .filter((recipe) => recipe.title.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((recipe) => mode !== 'saved' || saved.has(recipe.id));
  const matches = (mode === 'all' ? [] : recipes)
    .map((recipe) => getRecipeAvailability(data, recipe, recipe.servings, todayLocal()))
    .sort((left, right) => {
      if (mode === 'use-up' && left.expiringSoon !== right.expiringSoon)
        return right.expiringSoon - left.expiringSoon;
      const rank = { confirmed: 0, 'needs-review': 1, missing: 2 };
      return (
        rank[left.status] - rank[right.status] ||
        right.expiringSoon - left.expiringSoon ||
        left.ingredients.filter((item) => !item.ingredient.optional && item.status === 'missing')
          .length -
          right.ingredients.filter((item) => !item.ingredient.optional && item.status === 'missing')
            .length ||
        left.recipe.title.localeCompare(right.recipe.title)
      );
    });
  return (
    <section className="cookbook-page" aria-label="Your cookbook">
      {mode !== 'all' && (
        <div className="cookbook-intro">
          <img src="/art/cookbook.svg" alt="" />
          <div>
            <h2>What’s for dinner?</h2>
            <p>Recipes for what you have.</p>
          </div>
        </div>
      )}
      <div className="cookbook-modes" role="group" aria-label="Recipe order">
        <button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>
          All recipes
        </button>
        <button aria-pressed={mode === 'inventory'} onClick={() => setMode('inventory')}>
          Your kitchen
        </button>
        <button aria-pressed={mode === 'use-up'} onClick={() => setMode('use-up')}>
          Use it up
        </button>
        <button aria-pressed={mode === 'saved'} onClick={() => setMode('saved')}>
          Saved
        </button>
      </div>
      <button className="secondary full" onClick={onSuggest}>
        Suggest with AI
      </button>
      {mode === 'use-up' && (
        <p className="muted cookbook-note">
          Ingredients dated within the next 7 days come first. Check their condition before cooking.
        </p>
      )}
      <div className="cookbook-tools">
        <button className="text-button" onClick={onAdd}>
          <Plus size={17} />
          Write a recipe
        </button>
        <button className="text-button" onClick={onImport}>
          <FileInput size={17} />
          Import
        </button>
      </div>
      <div className="recipe-list" aria-live="polite">
        {mode === 'all' ? (
          <RecipeIndex recipes={recipes} onOpen={onOpen} />
        ) : (
          matches.map((match) => (
            <RecipeCard
              key={match.recipe.id}
              match={match}
              saved={saved.has(match.recipe.id)}
              onOpen={onOpen}
            />
          ))
        )}
        {!recipes.length && (
          <div className="empty-state">
            <BookOpen size={30} />
            <h3>{query ? 'No recipes found' : 'Your pages are ready'}</h3>
            <p>{query ? 'Try another recipe name.' : 'Save a recipe or write one of your own.'}</p>
          </div>
        )}
      </div>
      <MealPlanList onOpen={onOpen} />
    </section>
  );
}
