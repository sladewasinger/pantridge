import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { dispatch, getAccount } from '../../data/store';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { useMounted } from '../../ui/useMounted';
import { IngredientEditor } from './IngredientEditor';
import { parseRecipeDraft, recipeDraft, type RecipeDraft } from './editorState';

export function RecipeEditor({ recipe, onClose }: { recipe?: Recipe; onClose: () => void }) {
  const isMounted = useMounted();
  const [account] = useState(getAccount);
  const [draft, setDraft] = useState(() => recipeDraft(recipe));
  const [id] = useState(() => recipe?.id ?? crypto.randomUUID());
  const { run, busy, error } = useAction();
  const patch = (value: Partial<RecipeDraft>) => setDraft((current) => ({ ...current, ...value }));
  return (
    <Modal title={recipe ? 'Edit recipe' : 'Write a recipe'} onClose={onClose}>
      <form
        className="recipe-editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            if (getAccount() !== account)
              throw new Error('Your kitchen changed. Reopen this recipe before saving.');
            const next = parseRecipeDraft(draft, recipe, id);
            await dispatch({ type: 'recipe.save', recipe: next });
            if (isMounted() && getAccount() === account) onClose();
          });
        }}
      >
        {recipe?.source === 'ai' && (
          <p className="muted">
            AI-generated recipe. Review the ingredients, allergens, amounts, and cooking steps
            before saving.
          </p>
        )}
        <fieldset disabled={busy} className="recipe-form-fields">
          <label>
            Recipe name
            <input
              value={draft.title}
              maxLength={120}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>
          <label>
            Description <span className="optional">optional</span>
            <textarea
              rows={2}
              value={draft.description}
              maxLength={1000}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>
          <div className="form-grid">
            <label>
              Servings
              <input
                type="number"
                min="1"
                max="100"
                value={draft.servings}
                onChange={(event) => patch({ servings: event.target.value })}
              />
            </label>
            <label>
              Minutes <span className="optional">optional</span>
              <input
                type="number"
                min="1"
                value={draft.minutes}
                onChange={(event) => patch({ minutes: event.target.value })}
              />
            </label>
          </div>
          <IngredientEditor
            ingredients={draft.ingredients}
            onChange={(ingredients) => patch({ ingredients })}
          />
          <label className="recipe-steps-label">
            Steps
            <textarea
              rows={7}
              placeholder="One step per line"
              value={draft.steps}
              onChange={(event) => patch({ steps: event.target.value })}
              aria-describedby="recipe-steps-hint"
            />
          </label>
          <p id="recipe-steps-hint" className="muted">
            One step per line. Ingredient amounts must be greater than zero.
          </p>
          <details>
            <summary>Recipe details</summary>
            <label>
              Additional ingredients <span className="optional">optional</span>
              <textarea
                rows={3}
                value={draft.extras}
                onChange={(event) => patch({ extras: event.target.value })}
                placeholder="Unmeasured seasoning or garnish, one per line"
              />
            </label>
            <label>
              Cuisine <span className="optional">optional</span>
              <input
                value={draft.cuisine}
                maxLength={60}
                onChange={(event) => patch({ cuisine: event.target.value })}
              />
            </label>
            <label>
              Source URL <span className="optional">optional</span>
              <input
                type="url"
                value={draft.sourceUrl}
                onChange={(event) => patch({ sourceUrl: event.target.value })}
                placeholder="https://"
              />
            </label>
          </details>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? 'Saving…' : 'Save recipe'}
        </button>
        <button type="button" className="text-button full" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </form>
    </Modal>
  );
}
