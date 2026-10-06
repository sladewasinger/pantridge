import { useState } from 'react';
import { dispatch, useKitchen } from '../../data/store';
import type { MealPlanEntry, Recipe } from '../../domain/recipes/model';
import { getMealPlan } from '../../domain/recipes/selectors';
import { useAction } from '../../ui/useAction';
import { todayLocal, dateLabel } from './presentation';

export function MealPlanner({
  recipe,
  servings,
  entry,
  onUpdate,
}: {
  recipe: Recipe;
  servings: number;
  entry?: MealPlanEntry;
  onUpdate?: (entry: MealPlanEntry) => void;
}) {
  const { data } = useKitchen();
  const [date, setDate] = useState(() => entry?.date ?? todayLocal());
  const [saved, setSaved] = useState('');
  const { run, busy, error } = useAction();
  return (
    <details className="recipe-planner">
      <summary>{entry ? 'Update planned date' : 'Plan this meal'}</summary>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a date for this meal.');
            const existing = getMealPlan(data).find(
              (entry) => entry.recipeId === recipe.id && entry.date === date,
            );
            const next = {
              id: entry?.id ?? existing?.id ?? crypto.randomUUID(),
              recipeId: recipe.id,
              date,
              servings,
            };
            await dispatch({ type: 'mealPlan.save', entry: next });
            if (entry) onUpdate?.(next);
            setSaved(date);
          });
        }}
      >
        <label>
          Meal date
          <input
            type="date"
            value={date}
            disabled={busy}
            onChange={(event) => {
              setDate(event.target.value);
              setSaved('');
            }}
          />
        </label>
        <p className="muted">{servings} servings. Planning leaves your stock unchanged.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {saved && <p role="status">Planned for {dateLabel(saved)}.</p>}
        <button className="secondary full" disabled={busy || saved === date}>
          {busy ? 'Saving…' : 'Save to meal plan'}
        </button>
      </form>
    </details>
  );
}
