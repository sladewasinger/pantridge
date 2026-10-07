import { Bookmark, Pencil } from 'lucide-react';
import type { Recipe } from '../../domain/recipes/model';
import { getRecipeAvailability } from '../../domain/recipes/availability';
import { useKitchen } from '../../data/store';
import { Modal } from '../../ui/Modal';
import { RecipeSummary } from '../cookbook/RecipeSummary';
import { RecipeIngredients } from '../cookbook/RecipeIngredients';
import { RecipeExtras, RecipeNutrition } from '../cookbook/RecipeNutrition';
import { amountLabel, todayLocal } from '../cookbook/presentation';
import type { RecipePreferences } from '../../domain/recipe-preferences/model';
import { RecipeVariations } from '../recipe-enhancements/RecipeVariations';
import { DietReview } from '../recipe-enhancements/DietReview';
import type { useDietReview } from '../recipe-enhancements/useDietReview';

export function SuggestionPreview({
  recipe,
  busy,
  saved,
  error,
  onSave,
  onEdit,
  onClose,
  preferences,
  diet,
  changed,
  onChange,
  onUndo,
}: {
  recipe: Recipe;
  busy: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
  onEdit: () => void;
  onClose: () => void;
  preferences: RecipePreferences;
  diet: ReturnType<typeof useDietReview>;
  changed: boolean;
  onChange: (next: Recipe) => void;
  onUndo: () => void;
}) {
  const { data } = useKitchen();
  const match = getRecipeAvailability(data, recipe, recipe.servings, todayLocal());
  return (
    <Modal
      title={recipe.title}
      onClose={onClose}
      footer={
        <div className="suggestion-preview-footer">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {diet.required && (
            <p className="error" role="alert">
              Open Diet check and review ingredients, labels and preparation before saving.
            </p>
          )}
          {saved && (
            <p className="muted" role="status">
              Saved to your cookbook.
            </p>
          )}
          <div className="suggestion-preview-actions">
            <button
              className="text-button"
              disabled={busy}
              onClick={onEdit}
              aria-label="Edit recipe"
            >
              <Pencil size={16} /> Edit
            </button>
            <button className="primary" disabled={busy || saved} onClick={onSave}>
              <Bookmark size={17} /> {busy ? 'Saving…' : saved ? 'Saved' : 'Save recipe'}
            </button>
          </div>
        </div>
      }
    >
      <div className="recipe-detail suggestion-preview">
        <RecipeSummary recipe={recipe} />
        <DietReview
          recipe={recipe}
          preferences={preferences}
          checked={diet.checked}
          onChange={diet.onChange}
        />
        <section aria-label="Recipe ingredients">
          <h3>Ingredients</h3>
          <ul className="suggestion-preview-ingredients">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                <div>
                  <span>
                    {ingredient.name}
                    {ingredient.optional && <small> · optional</small>}
                  </span>
                  <span>{amountLabel(ingredient.quantity, ingredient.unit)}</span>
                </div>
                {ingredient.note && <small>{ingredient.note}</small>}
              </li>
            ))}
          </ul>
        </section>
        <section className="recipe-method" aria-label="Cooking steps">
          <h3>Method</h3>
          <ol>
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
        <details className="suggestion-preview-details">
          <summary>Kitchen match &amp; substitutions</summary>
          <RecipeIngredients ingredients={match.ingredients} />
        </details>
        <RecipeExtras recipe={recipe} />
        <RecipeVariations
          recipe={recipe}
          preferences={preferences}
          busy={busy}
          changed={changed}
          onChange={onChange}
          onUndo={onUndo}
        />
        <RecipeNutrition recipe={recipe} />
      </div>
    </Modal>
  );
}
