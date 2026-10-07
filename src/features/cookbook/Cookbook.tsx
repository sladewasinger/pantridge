import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useKitchen } from '../../data/store';
import { getRecipes } from '../../domain/recipes/selectors';
import { browseRecipes, soonestDate } from '../../domain/recipes/browse';
import { RecipeCard } from './RecipeCard';
import { MealPlanList } from './MealPlanList';
import { todayLocal } from './presentation';
import { BrowseControls } from './browse/BrowseControls';
import { readPreferences, storePreferences, type BrowsePreferences } from './browse/preferences';

export function Cookbook({
  query,
  onOpen,
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
  const [preferences, setPreferences] = useState(readPreferences);
  const [extraRows, setExtraRows] = useState(0);
  const [browseKey, setBrowseKey] = useState('');
  const currentKey = JSON.stringify([query, preferences]);
  const saved = new Set(getRecipes(data).map((recipe) => recipe.id));
  const today = todayLocal();
  const matches = useMemo(
    () => browseRecipes(data, query, preferences, today),
    [data, query, preferences, today],
  );
  const visible = 24 + (browseKey === currentKey ? extraRows : 0);
  const change = (value: BrowsePreferences) => {
    setPreferences(value);
    storePreferences(value);
  };
  return (
    <section className="cookbook-page" aria-label="Your cookbook">
      <div className="cookbook-intro">
        <img src="/art/cookbook.svg" alt="" />
        <div>
          <h2>What’s for dinner?</h2>
          <p>Recipes for what you have.</p>
        </div>
      </div>
      <BrowseControls
        value={preferences}
        onChange={change}
        onImport={onImport}
        onSuggest={onSuggest}
      />
      <p className="muted cookbook-list-summary" role="status">
        {matches.length} {matches.length === 1 ? 'recipe' : 'recipes'}
        {preferences.order === 'use-soon' && <span> · Use soon first</span>}
        {!preferences.builtIns && <span> · Yours only</span>}
      </p>
      <div className="recipe-list">
        {matches.slice(0, visible).map((match) => (
          <RecipeCard
            key={match.recipe.id}
            match={match}
            saved={saved.has(match.recipe.id)}
            useSoon={soonestDate(data, match, today)}
            onOpen={onOpen}
          />
        ))}
        {!matches.length && (
          <div className="empty-state">
            <BookOpen size={30} />
            <h3>{query ? 'No recipes found' : 'Your pages are ready'}</h3>
            <p>
              {query
                ? 'Try a recipe or ingredient name.'
                : 'Save a recipe, or include built-in recipes from View.'}
            </p>
          </div>
        )}
      </div>
      {matches.length > visible && (
        <button
          className="text-button full"
          onClick={() => {
            setBrowseKey(currentKey);
            setExtraRows(visible);
          }}
        >
          Show more recipes
        </button>
      )}
      <MealPlanList onOpen={onOpen} />
    </section>
  );
}
