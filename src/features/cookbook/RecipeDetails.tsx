import { useRef, useState } from 'react';
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
import { RecipeNutrition, RecipeExtras } from './RecipeNutrition';
import { useVariations } from '../recipe-enhancements/useVariations';
import { RecipeVariations } from '../recipe-enhancements/RecipeVariations';
import { DietReview } from '../recipe-enhancements/DietReview';
import { RecipeSaveTools } from '../recipe-enhancements/RecipeSaveTools';

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
  recipe: original,
  plan,
  onClose,
}: {
  recipe: Recipe;
  plan?: MealPlanEntry;
  onClose: () => void;
}) {
  const { data } = useKitchen();
  const variations = useVariations(original);
  const { recipe, preferences, diet } = variations;
  const [account] = useState(getAccount);
  const isMounted = useMounted();
  const [planned, setPlanned] = useState(plan);
  const [servingsInput, setServingsInput] = useState(() => initialServings(recipe, plan));
  const planStale = planReviewIsStale(data, planned);
  const [mode, setMode] = useState<'read' | 'edit' | 'cook'>('read');
  const navigation = useRef(0);
  const show = (next: typeof mode) => {
    navigation.current++;
    setMode(next);
  };
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
  const saveRecipe = async (next: Recipe) => {
    if (getAccount() !== account) throw new Error('Your kitchen changed. Reopen this recipe.');
    if (!diet.check(next)) {
      variations.onChange(next);
      show('read');
      return;
    }
    const startedAt = navigation.current;
    await dispatch({ type: 'recipe.save', recipe: next });
    if (isMounted() && getAccount() === account && navigation.current === startedAt) {
      variations.onUndo();
      show('read');
    }
  };
  if (mode === 'edit')
    return <RecipeEditor recipe={recipe} onSave={saveRecipe} onClose={() => show('read')} />;
  if (mode === 'cook')
    return (
      <CookReview
        recipe={recipe}
        servings={servings}
        expectedPlan={planned}
        onCancel={() => show('read')}
        onDone={() => {
          if (planned) onClose();
          else {
            setCooked(true);
            show('read');
          }
        }}
      />
    );
  return (
    <Modal title={recipe.title} onClose={onClose}>
      <div className="recipe-detail">
        <RecipeSummary recipe={recipe} />
        <RecipeSaveTools
          busy={busy}
          saved={saved}
          changed={variations.changed}
          onSave={() => void run(() => saveRecipe(recipe))}
          onEdit={() => show('edit')}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {diet.required && (
          <p className="error" role="alert">
            Open Diet check and review ingredients, labels and preparation first.
          </p>
        )}
        <DietReview
          recipe={recipe}
          preferences={preferences}
          checked={diet.checked}
          onChange={diet.onChange}
        />
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
        <RecipeExtras recipe={recipe} />
        <section className="recipe-method" aria-label="Cooking steps">
          <h3>Method</h3>
          <ol>
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
        <RecipeNutrition recipe={recipe} />
        <RecipeVariations
          recipe={recipe}
          preferences={preferences}
          busy={busy}
          changed={variations.changed}
          onChange={variations.onChange}
          onUndo={variations.onUndo}
        />
        {validServings && (
          <>
            <MissingShopping key={`shopping-${servings}`} recipe={recipe} servings={servings} />
            {!variations.changed && (
              <MealPlanner
                key={`plan-${servings}`}
                recipe={recipe}
                servings={servings}
                entry={planned}
                onUpdate={setPlanned}
              />
            )}
          </>
        )}
        <button
          className="primary full"
          disabled={!validServings || busy || planStale || variations.changed}
          onClick={() => {
            if (!diet.check(recipe)) return;
            setCooked(false);
            show('cook');
          }}
        >
          Review cooked meal
        </button>
        {variations.changed && (
          <p className="muted">Save changes before planning or cooking this version.</p>
        )}
        <RecipeRemove recipe={recipe} onRemoved={onClose} />
        <p className="muted cookbook-note">
          Opening a recipe never changes your stock. Confirm what you used after cooking.
        </p>
      </div>
    </Modal>
  );
}
