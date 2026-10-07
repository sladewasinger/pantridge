import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { chooseIngredients, ingredientChoices } from '../../domain/recipe-suggestions/choices';
import { getAccount, getKitchen, useKitchen } from '../../data/store';
import { RecipeEditor } from '../cookbook/RecipeEditor';
import { todayLocal } from '../cookbook/presentation';
import { Modal } from '../../ui/Modal';

export function SuggestionReview({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { data } = useKitchen();
  const [account] = useState(getAccount);
  const [needed] = useState(() => ingredientChoices(data, recipe, todayLocal()));
  const choices = ingredientChoices(data, recipe, todayLocal());
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Recipe>();
  const [error, setError] = useState('');
  if (review || !needed.length) return <RecipeEditor recipe={review ?? recipe} onClose={onClose} />;
  return (
    <Modal title="Choose ingredients" onClose={onClose}>
      <form
        className="recipe-editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          try {
            if (getAccount() !== account)
              throw new Error('Your kitchen changed. Reopen this recipe.');
            const current = getKitchen().data;
            const available = ingredientChoices(current, recipe, todayLocal());
            if (
              needed.some(
                (item) => !available.some((choice) => choice.ingredient.id === item.ingredient.id),
              )
            )
              throw new Error('Your stock changed. Reopen this recipe to review the ingredients.');
            setReview(chooseIngredients(current, recipe, selections, todayLocal()));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Review your ingredient choices.');
          }
        }}
      >
        <p className="muted">Choose the food to use, then review its amounts and cooking steps.</p>
        {needed.map(({ ingredient }) => (
          <label key={ingredient.id}>
            Food for {ingredient.name}
            <select
              value={selections[ingredient.id] ?? ''}
              onChange={(event) => {
                setError('');
                setSelections({
                  ...selections,
                  [ingredient.id]: event.target.value,
                });
              }}
            >
              <option value="">Choose food</option>
              {choices
                .find((choice) => choice.ingredient.id === ingredient.id)
                ?.options.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
            {ingredient.note && <small className="muted">{ingredient.note}</small>}
          </label>
        ))}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full">Review recipe</button>
        <button type="button" className="text-button full" onClick={onClose}>
          Cancel
        </button>
      </form>
    </Modal>
  );
}
