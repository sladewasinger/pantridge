import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { getRecipeAvailability } from '../../domain/recipes/availability';
import { getRecipes } from '../../domain/recipes/selectors';
import { buildRecipeSuggestionRequest } from '../../domain/recipe-suggestions/inventory';
import { getAccount, useKitchen } from '../../data/store';
import { Modal } from '../../ui/Modal';
import { RecipeEditor } from '../cookbook/RecipeEditor';
import { recipeMeta, todayLocal } from '../cookbook/presentation';
import { useRecipeSuggestions } from './useRecipeSuggestions';
import { requiresSignIn } from '../../local-testing';

export function RecipeSuggestions({ onClose }: { onClose: () => void }) {
  const { data } = useKitchen();
  const suggestions = useRecipeSuggestions();
  const [review, setReview] = useState<Recipe>();
  const saved = new Set(getRecipes(data).map((recipe) => recipe.id));
  const request = buildRecipeSuggestionRequest(data, suggestions.useUp, todayLocal());
  const changed = suggestions.basis && suggestions.basis !== JSON.stringify(request);
  if (suggestions.account !== getAccount())
    return (
      <Modal title="Suggest with AI" onClose={onClose}>
        <p role="alert">
          Your kitchen changed. Reopen the cookbook before requesting or saving recipes.
        </p>
      </Modal>
    );
  if (review) return <RecipeEditor recipe={review} onClose={() => setReview(undefined)} />;
  return (
    <Modal title="Suggest with AI" onClose={onClose}>
      <div className="recipe-suggestions">
        <p>Get recipe ideas from the food in your kitchen.</p>
        <p className="muted">
          Sends up to 40 recognized food names, quantities, and use-soon reminders to OpenAI.
          Supplies and past-date lots are left out. Review amounts, allergens, and cooking steps
          before saving.
        </p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={suggestions.useUp}
            disabled={suggestions.busy}
            onChange={(event) => suggestions.setUseUp(event.target.checked)}
          />
          Use dated ingredients first
        </label>
        <p className="muted">
          {request.inventory.length} ingredient types included. Dates do not guarantee freshness.
        </p>
        {requiresSignIn(suggestions.account) && (
          <p className="muted">Sign in with Google from Settings to suggest recipes.</p>
        )}
        {suggestions.error && (
          <p className="error" role="alert">
            {suggestions.error}
          </p>
        )}
        <button
          className="primary full"
          disabled={
            suggestions.busy || requiresSignIn(suggestions.account) || !request.inventory.length
          }
          onClick={() => void suggestions.generate()}
        >
          {suggestions.busy ? 'Finding recipe ideas…' : 'Suggest recipes'}
        </button>
        {suggestions.busy && (
          <p role="status">Creating ideas. You can close this without changing your kitchen.</p>
        )}
        {changed && (
          <p role="status" className="muted">
            Your kitchen or recipe preference changed. Matches below use your current stock; suggest
            again for new ideas.
          </p>
        )}
        {suggestions.recipes?.length === 0 && (
          <p role="status">No useful recipes found. Add more food or try again.</p>
        )}
        <div className="suggestion-results">
          {suggestions.recipes?.map((recipe) => {
            const match = getRecipeAvailability(data, recipe, recipe.servings, todayLocal());
            return (
              <article className="suggestion-result" key={recipe.id}>
                <h3>{recipe.title}</h3>
                <p className="recipe-meta">{recipeMeta(recipe)} · AI-generated</p>
                {recipe.description && <p>{recipe.description}</p>}
                <p className="muted">
                  {match.pastDate > 0
                    ? 'Check past-date ingredients before using matching stock.'
                    : match.status === 'confirmed'
                      ? 'Ingredient amounts match your stock.'
                      : match.status === 'needs-review'
                        ? 'Check your package amounts.'
                        : 'Some ingredients need shopping or a suitable substitution.'}
                </p>
                <button
                  className="secondary full"
                  disabled={saved.has(recipe.id)}
                  onClick={() => setReview(recipe)}
                >
                  {saved.has(recipe.id) ? 'Saved' : 'Review recipe'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
