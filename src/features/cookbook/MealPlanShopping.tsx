import { useState } from 'react';
import { dispatch, useKitchen } from '../../data/store';
import { getCookbookRecipes, getMealPlan } from '../../domain/recipes/selectors';
import { buildMealPlanShopping } from '../../domain/recipes/plan-shopping';
import type { MealPlanEntry } from '../../domain/recipes/model';
import { prepareShopping, ShoppingReview } from './ShoppingReview';
import { dateLabel, todayLocal } from './presentation';

function upcomingIds(entries: MealPlanEntry[]): string[] {
  const today = todayLocal();
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return entries
    .filter((entry) => entry.date >= today && new Date(`${entry.date}T12:00:00`) <= end)
    .slice(0, 20)
    .map((entry) => entry.id);
}
export function MealPlanShopping() {
  const { data } = useKitchen();
  const entries = [...getMealPlan(data)].sort((a, b) => a.date.localeCompare(b.date));
  const recipes = getCookbookRecipes(data);
  const [selected, setSelected] = useState(() => upcomingIds(entries));
  const expectedEntries = entries.filter((entry) => selected.includes(entry.id));
  const entryIds = expectedEntries.map((entry) => entry.id);
  const proposal = prepareShopping(() =>
    buildMealPlanShopping(data, entryIds, () => crypto.randomUUID()),
  );
  return (
    <details className="recipe-shopping meal-plan-shopping">
      <summary>Shop planned meals</summary>
      <p className="muted">
        Choose up to 20 meals. Upcoming meals are selected first. Shared ingredients are totaled
        before subtracting your stock and shopping list.
      </p>
      <div role="group" aria-label="Meals to shop for">
        {entries.map((entry) => (
          <label className="meal-plan-select" key={entry.id}>
            <input
              type="checkbox"
              checked={selected.includes(entry.id)}
              disabled={!selected.includes(entry.id) && selected.length >= 20}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, entry.id]
                    : selected.filter((id) => id !== entry.id),
                )
              }
            />
            <span>
              {dateLabel(entry.date)} ·{' '}
              {recipes.find((recipe) => recipe.id === entry.recipeId)?.title ?? 'Recipe'}
              <small>{entry.servings} servings</small>
            </span>
          </label>
        ))}
      </div>
      {entryIds.length > 0 ? (
        <ShoppingReview
          key={JSON.stringify(expectedEntries)}
          proposal={proposal}
          onAdd={(items) =>
            dispatch({ type: 'mealPlan.addMissing', entryIds, expectedEntries, items })
          }
        />
      ) : (
        <p className="muted">Choose at least one meal.</p>
      )}
    </details>
  );
}
