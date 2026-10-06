import { dispatch, dispatchMany, getAccount, getKitchen, useKitchen } from '../../data/store';
import type { Recipe } from '../../domain/recipes/model';
import { getMealPlan, getRecipes } from '../../domain/recipes/selectors';
import { starterRecipes } from '../../domain/recipes/starters';
import { showUndo } from '../../ui/notice';
import { useAction } from '../../ui/useAction';

export function RecipeRemove({ recipe, onRemoved }: { recipe: Recipe; onRemoved: () => void }) {
  const { data } = useKitchen();
  const { run, error, busy } = useAction();
  if (!getRecipes(data).some((item) => item.id === recipe.id)) return null;
  const isStarter = starterRecipes.some((item) => item.id === recipe.id);
  const count = getMealPlan(data).filter((entry) => entry.recipeId === recipe.id).length;
  return (
    <details className="recipe-remove">
      <summary>{isStarter ? 'Remove saved copy' : 'Remove saved recipe'}</summary>
      <p className="muted">
        This removes your saved recipe and {count} planned meal{count === 1 ? '' : 's'}. Cooked
        meals and stock stay unchanged.
        {isStarter ? ' The original starter recipe will still be available.' : ''}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="text-button danger full"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const account = getAccount();
            const plans = getMealPlan(getKitchen().data).filter(
              (entry) => entry.recipeId === recipe.id,
            );
            await dispatch({ type: 'recipe.remove', recipeId: recipe.id });
            showUndo('Saved recipe removed', async () => {
              if (getAccount() !== account)
                throw new Error('Your kitchen changed. Reopen this kitchen before undoing.');
              if (getRecipes(getKitchen().data).some((item) => item.id === recipe.id))
                throw new Error(
                  'A saved version already exists. Keep it or remove it before restoring this version.',
                );
              await dispatchMany([
                { type: 'recipe.restore', recipe },
                ...plans.map((entry) => ({ type: 'mealPlan.restore' as const, entry })),
              ]);
            });
            if (getAccount() === account) onRemoved();
          })
        }
      >
        {busy ? 'Removing…' : 'Remove recipe and planned meals'}
      </button>
    </details>
  );
}
