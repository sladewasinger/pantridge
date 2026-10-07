import { useMemo, useState } from 'react';
import { useKitchen } from '../../data/store';
import { getRecipes } from '../../domain/recipes/selectors';
import { browseRecipes } from '../../domain/recipes/browse';
import { RecipeList } from './browse/RecipeList';
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
        {matches.length}{' '}
        {preferences.includeUnmatched
          ? matches.length === 1
            ? 'recipe'
            : 'recipes'
          : matches.length === 1
            ? 'kitchen match'
            : 'kitchen matches'}
        {preferences.order === 'use-soon' && <span> · Use soon first</span>}
        {!preferences.builtIns && <span> · Yours only</span>}
      </p>
      <RecipeList
        matches={matches.slice(0, visible)}
        saved={saved}
        data={data}
        today={today}
        onOpen={onOpen}
        empty={
          preferences.includeUnmatched
            ? 'Try another search or change the filters in View.'
            : 'Add kitchen ingredients, or show recipes without matches from View.'
        }
      />
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
