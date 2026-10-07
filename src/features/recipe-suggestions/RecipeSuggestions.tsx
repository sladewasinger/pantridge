import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { getRecipes } from '../../domain/recipes/selectors';
import { buildSuggestionContext } from '../../domain/recipe-suggestions/grounding';
import { recipeFit } from '../../domain/recipe-preferences/fit';
import { RecipePreferences } from '../recipe-preferences/RecipePreferences';
import { getAccount, useKitchen } from '../../data/store';
import { Modal } from '../../ui/Modal';
import { SuggestionReview } from './SuggestionReview';
import { suggestionHint } from './preview';
import { recipeMeta, todayLocal } from '../cookbook/presentation';
import { useRecipeSuggestions } from './useRecipeSuggestions';
import { requiresSignIn } from '../../local-testing';
import { RecipeNutrition } from '../cookbook/RecipeNutrition';
import { withCalculatedNutrition } from '../../domain/recipe-nutrition/calculate';

export function RecipeSuggestions({ onClose }: { onClose: () => void }) {
  const { data } = useKitchen();
  const suggestions = useRecipeSuggestions();
  const [review, setReview] = useState<Recipe>();
  const saved = new Set(getRecipes(data).map((recipe) => recipe.id));
  const { request } = buildSuggestionContext(
    data,
    suggestions.useUp,
    suggestions.preferences,
    todayLocal(),
  );
  const changed = suggestions.basis && suggestions.basis !== JSON.stringify(request);
  if (suggestions.account !== getAccount())
    return (
      <Modal title="Suggest with AI" onClose={onClose}>
        <p role="alert">
          Your kitchen changed. Reopen the cookbook before requesting or saving recipes.
        </p>
      </Modal>
    );
  if (review)
    return (
      <SuggestionReview
        key={review.id}
        recipe={review}
        preferences={suggestions.preferences}
        onClose={() => setReview(undefined)}
      />
    );
  return (
    <Modal title="Suggest with AI" onClose={onClose}>
      <div className="recipe-suggestions">
        <p>Get recipe ideas from the food in your kitchen.</p>
        <RecipePreferences
          value={suggestions.preferences}
          disabled={suggestions.busy}
          onChange={suggestions.changePreferences}
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={suggestions.useUp}
            disabled={suggestions.busy}
            onChange={(event) => suggestions.setUseUp(event.target.checked)}
          />
          Use dated ingredients first
        </label>
        <details>
          <summary>What gets sent?</summary>
          <p className="muted">
            {request.inventory.reduce((count, item) => count + (item.members?.length ?? 1), 0)}{' '}
            exact food names in {request.inventory.length} groups, cooking details, date reminders,
            chosen preferences, and up to three cookbook methods. Supplies and past-date lots are
            excluded. No stock quantities or account identity. Dates do not guarantee freshness.
          </p>
        </details>
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
          {suggestions.recipes
            ?.map((recipe) => withCalculatedNutrition(data, recipe))
            .map((recipe) => (
              <article className="suggestion-result" key={recipe.id}>
                <h3>{recipe.title}</h3>
                <p className="recipe-meta">{recipeMeta(recipe)} · AI-generated</p>
                {recipe.description && <p>{recipe.description}</p>}
                <details>
                  <summary>Fit &amp; nutrition</summary>
                  {recipe.generation?.reason && (
                    <p className="muted">AI rationale: {recipe.generation.reason}</p>
                  )}
                  {recipeFit(recipe, suggestions.preferences).map((note) => (
                    <p className="muted" key={note}>
                      {note}
                    </p>
                  ))}
                  <RecipeNutrition recipe={recipe} />
                </details>
                <p className="muted">{suggestionHint(data, recipe, todayLocal())}</p>
                <button
                  className="secondary full"
                  disabled={saved.has(recipe.id)}
                  onClick={() => setReview(recipe)}
                >
                  {saved.has(recipe.id) ? 'Saved' : 'View recipe'}
                </button>
              </article>
            ))}
        </div>
      </div>
    </Modal>
  );
}
