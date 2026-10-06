import { useState } from 'react';
import { Bookmark, Pencil } from 'lucide-react';
import { dispatch, getAccount, useKitchen } from '../../data/store';
import { getCookbookRecipes, getMealPlan, getRecipes } from '../../domain/recipes/selectors';
import { getRecipeAvailability } from '../../domain/recipes/availability';
import type { Recipe, MealPlanEntry } from '../../domain/recipes/model';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { useMounted } from '../../ui/useMounted';
import { RecipeIngredients } from './RecipeIngredients';
import { RecipeRemove } from './RecipeRemove';
import { RecipeEditor } from './RecipeEditor';
import { CookReview } from './CookReview';
import { MealPlanner } from './MealPlanner';
import { MissingShopping } from './MissingShopping';
import { initialServings, planReviewIsStale } from './cookDraft';
import { RecipeSummary, RecipeServings } from './RecipeSummary';
import { todayLocal } from './presentation';

export function RecipeDetails({
  recipeId,
  planEntryId,
  onClose,
}: {
  recipeId: string;
  planEntryId?: string;
  onClose: () => void;
}) {
  const { data } = useKitchen();
  const [account] = useState(getAccount);
  const isMounted = useMounted();
  const dismiss = () => {
    if (isMounted() && getAccount() === account) onClose();
  };
  const recipe = getCookbookRecipes(data).find((item) => item.id === recipeId);
  if (!recipe)
    return (
      <Modal title="Recipe unavailable" onClose={dismiss}>
        <p>This recipe is no longer in your cookbook.</p>
        <button className="secondary full" onClick={dismiss}>
          Back to cookbook
        </button>
      </Modal>
    );
  const plan = getMealPlan(data).find(
    (entry) => entry.id === planEntryId && entry.recipeId === recipeId,
  );
  if (planEntryId && !plan)
    return (
      <Modal title={recipe.title} onClose={dismiss}>
        <p>
          This planned meal is no longer scheduled. Open the recipe from your cookbook to cook it
          again.
        </p>
        <button className="secondary full" onClick={dismiss}>
          Back to cookbook
        </button>
      </Modal>
    );
  return (
    <RecipeContent
      key={`${recipe.id}:${planEntryId ?? ''}`}
      recipe={recipe}
      plan={plan}
      onClose={dismiss}
    />
  );
}
function RecipeContent({
  recipe,
  plan,
  onClose,
}: {
  recipe: Recipe;
  plan?: MealPlanEntry;
  onClose: () => void;
}) {
  const { data } = useKitchen();
  const [planned, setPlanned] = useState(plan);
  const [servingsInput, setServingsInput] = useState(() => initialServings(recipe, plan));
  const planStale = planReviewIsStale(data, planned);
  const [mode, setMode] = useState<'read' | 'edit' | 'cook'>('read');
  const [cooked, setCooked] = useState(false);
  const { run, busy, error } = useAction();
  const servings = Number(servingsInput);
  const validServings = Number.isFinite(servings) && servings > 0 && servings <= 100;
  const match = getRecipeAvailability(
    data,
    recipe,
    validServings ? servings : recipe.servings,
    todayLocal(),
  );
  const saved = getRecipes(data).some((item) => item.id === recipe.id);
  if (mode === 'edit') return <RecipeEditor recipe={recipe} onClose={() => setMode('read')} />;
  if (mode === 'cook')
    return (
      <CookReview
        recipe={recipe}
        servings={servings}
        expectedPlan={planned}
        onCancel={() => setMode('read')}
        onDone={() => {
          if (planned) onClose();
          else {
            setCooked(true);
            setMode('read');
          }
        }}
      />
    );
  return (
    <Modal title={recipe.title} onClose={onClose}>
      <div className="recipe-detail">
        <RecipeSummary recipe={recipe} />
        <div className="recipe-detail-tools">
          <button
            className="text-button"
            disabled={busy || saved}
            onClick={() => void run(() => dispatch({ type: 'recipe.save', recipe }))}
          >
            <Bookmark size={17} />
            {saved ? 'Saved' : 'Save recipe'}
          </button>
          <button className="text-button" onClick={() => setMode('edit')}>
            <Pencil size={17} />
            Edit
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {cooked && (
          <p className="recipe-success" role="status">
            Meal recorded. Your reviewed stock changes are saved.
          </p>
        )}
        <RecipeServings
          value={servingsInput}
          onChange={setServingsInput}
          plan={planned}
          stale={planStale}
        />
        <RecipeIngredients ingredients={match.ingredients} />
        <section className="recipe-method" aria-label="Cooking steps">
          <h3>Method</h3>
          <ol>
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
        {validServings && (
          <>
            <MissingShopping key={`shopping-${servings}`} recipe={recipe} servings={servings} />
            <MealPlanner
              key={`plan-${servings}`}
              recipe={recipe}
              servings={servings}
              entry={planned}
              onUpdate={setPlanned}
            />
          </>
        )}
        <button
          className="primary full"
          disabled={!validServings || busy || planStale}
          onClick={() => {
            setCooked(false);
            setMode('cook');
          }}
        >
          Review cooked meal
        </button>
        <RecipeRemove recipe={recipe} onRemoved={onClose} />
        <p className="muted cookbook-note">
          Opening a recipe never changes your stock. Confirm what you used after cooking.
        </p>
      </div>
    </Modal>
  );
}
