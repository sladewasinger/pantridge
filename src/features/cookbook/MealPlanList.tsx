import { Trash2 } from 'lucide-react';
import { dispatch, useKitchen } from '../../data/store';
import { getCookbookRecipes, getMealPlan } from '../../domain/recipes/selectors';
import type { MealPlanEntry, Recipe } from '../../domain/recipes/model';
import { useAction } from '../../ui/useAction';
import { showUndo } from '../../ui/notice';
import { dateLabel } from './presentation';
import { MealPlanShopping } from './MealPlanShopping';
import { MissingShopping } from './MissingShopping';

export function MealPlanList({ onOpen }: { onOpen: (id: string, planEntryId?: string) => void }) {
  const { data } = useKitchen();
  const recipes = getCookbookRecipes(data);
  const entries = [...getMealPlan(data)].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className="meal-plan" aria-label="Meal plan">
      <h2>Meal plan</h2>
      {!entries.length && <p className="muted">Pick a date from any recipe.</p>}
      {entries.length > 0 && <MealPlanShopping />}
      {entries.map((entry) => {
        const recipe = recipes.find((item) => item.id === entry.recipeId);
        return recipe ? (
          <MealPlanRow key={entry.id} entry={entry} recipe={recipe} onOpen={onOpen} />
        ) : null;
      })}
    </section>
  );
}
function MealPlanRow({
  entry,
  recipe,
  onOpen,
}: {
  entry: MealPlanEntry;
  recipe: Recipe;
  onOpen: (id: string, planEntryId?: string) => void;
}) {
  const { run, busy, error } = useAction();
  return (
    <article className="meal-plan-row">
      <div className="meal-plan-heading">
        <button className="meal-plan-open" onClick={() => onOpen(recipe.id, entry.id)}>
          <time dateTime={entry.date}>{dateLabel(entry.date)}</time>
          <span>
            {recipe.title}
            <small>{entry.servings} servings</small>
          </span>
        </button>
        <button
          className="icon-button"
          aria-label={`Remove ${recipe.title} from meal plan`}
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await dispatch({ type: 'mealPlan.remove', entryId: entry.id });
              showUndo('Meal removed', () => dispatch({ type: 'mealPlan.restore', entry }));
            })
          }
        >
          <Trash2 size={17} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <MissingShopping key={entry.servings} recipe={recipe} servings={entry.servings} />
    </article>
  );
}
