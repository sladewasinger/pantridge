import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { chooseIngredients, ingredientChoices } from '../../domain/recipe-suggestions/choices';
import { getAccount, getKitchen, useKitchen } from '../../data/store';
import { todayLocal } from '../cookbook/presentation';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';

export function IngredientChoices({
  recipe,
  needed,
  onSave,
  onClose,
}: {
  recipe: Recipe;
  needed: ReturnType<typeof ingredientChoices>;
  onSave: (recipe: Recipe) => Promise<void>;
  onClose: () => void;
}) {
  const { data } = useKitchen();
  const [account] = useState(getAccount);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [showError, setShowError] = useState(true);
  const { run, busy, error } = useAction();
  const choices = ingredientChoices(data, recipe, todayLocal());
  return (
    <Modal title="Choose ingredients" onClose={onClose}>
      <form
        className="recipe-editor"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShowError(true);
          void run(async () => {
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
            await onSave(chooseIngredients(current, recipe, selections, todayLocal()));
          });
        }}
      >
        <p>Which food should this recipe use?</p>
        <p className="muted">Choose your stocked ingredients to save. No stock is deducted.</p>
        <fieldset disabled={busy}>
          {needed.map(({ ingredient }) => (
            <label key={ingredient.id}>
              Food for {ingredient.name}
              <select
                value={selections[ingredient.id] ?? ''}
                onChange={(event) => {
                  setShowError(false);
                  setSelections({ ...selections, [ingredient.id]: event.target.value });
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
        </fieldset>
        {error && showError && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? 'Saving…' : 'Save recipe'}
        </button>
        <button type="button" className="text-button full" disabled={busy} onClick={onClose}>
          Back to recipe
        </button>
      </form>
    </Modal>
  );
}
