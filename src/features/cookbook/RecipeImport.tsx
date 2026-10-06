import { useState } from 'react';
import { importRecipe } from '../../domain/recipes/import';
import type { Recipe } from '../../domain/recipes/model';
import { Modal } from '../../ui/Modal';
import { RecipeEditor } from './RecipeEditor';

const example =
  'My recipe\nServings: 2\n\nIngredients\n2 eggs\n1/2 cup milk\n\nSteps\n1. Whisk the ingredients.\n2. Cook as directed.';
export function RecipeImport({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState<Recipe>();
  if (recipe) return <RecipeEditor recipe={recipe} onClose={onClose} />;
  const review = () => {
    setError('');
    try {
      setRecipe(
        importRecipe(text, {
          id: crypto.randomUUID(),
          ingredientId: () => crypto.randomUUID(),
          source,
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read this recipe.');
    }
  };
  return (
    <Modal title="Import a recipe" onClose={onClose}>
      <form
        className="recipe-import"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          review();
        }}
      >
        <p className="muted">
          Paste recipe text or Recipe JSON. Review every amount before saving. Source links are
          saved, not fetched.
        </p>
        <label>
          Recipe text
          <textarea
            required
            rows={12}
            maxLength={50_000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={example}
          />
        </label>
        <label>
          Source link <span className="optional">optional</span>
          <input
            type="url"
            maxLength={500}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="https://…"
          />
        </label>
        <p className="muted">
          Use weight, volume, or individual counts. Check the servings, which default to 2 when
          absent.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Review recipe
          </button>
        </div>
      </form>
    </Modal>
  );
}
