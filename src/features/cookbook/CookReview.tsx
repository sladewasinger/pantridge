import { useState } from 'react';
import { dispatch, getAccount, getKitchen, useKitchen } from '../../data/store';
import type { MealPlanEntry, Recipe } from '../../domain/recipes/model';
import { previewCooking } from '../../domain/recipes/cooking';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { CookQuantities } from './CookQuantities';
import { dateLabel } from './presentation';
import { initialCookRows, planReviewIsStale, reviewedDeductions, reviewIsStale } from './cookDraft';

export function CookReview({
  recipe,
  servings,
  expectedPlan,
  onCancel,
  onDone,
}: {
  recipe: Recipe;
  servings: number;
  expectedPlan?: MealPlanEntry;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { data } = useKitchen();
  const [account] = useState(getAccount);
  const [planned] = useState(expectedPlan);
  const planStale = planReviewIsStale(data, planned);
  const [rows, setRows] = useState(() => initialCookRows(data, recipe, servings));
  const [checked, setChecked] = useState(false);
  const [recordId] = useState(() => crypto.randomUUID());
  const { run, busy, error } = useAction();
  const preview = previewCooking(data, recipe, servings);
  const stale = reviewIsStale(data, rows);
  const refresh = () => {
    setRows(initialCookRows(getKitchen().data, recipe, servings));
    setChecked(false);
  };
  return (
    <Modal
      title="Review what you used"
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            if (getAccount() !== account)
              throw new Error('Your kitchen changed. Reopen the cookbook.');
            if (!checked)
              throw new Error('Review the package amounts and check the confirmation below.');
            if (reviewIsStale(getKitchen().data, rows))
              throw new Error('Your stock changed. Refresh amounts and review again.');
            if (planReviewIsStale(getKitchen().data, planned))
              throw new Error(
                'The planned meal changed. Cancel and reopen it to review the current plan.',
              );
            await dispatch({
              type: 'recipe.cook',
              reviewed: true,
              expectedPlan: planned,
              record: {
                id: recordId,
                recipeId: recipe.id,
                recipeTitle: recipe.title,
                cookedAt: new Date().toISOString(),
                servings,
                deductions: reviewedDeductions(rows),
              },
            });
            if (getAccount() === account) onDone();
          });
        }}
      >
        <p>
          {recipe.title} · {servings} servings
        </p>
        {planned && (
          <p className="muted">Completes the meal planned for {dateLabel(planned.date)}.</p>
        )}
        <p className="muted">
          Only the amounts below will leave your stock. Edit them to match what you actually used. A
          fraction means part of a package.
        </p>
        {preview.notes.length > 0 && (
          <ul className="cook-review-notes">
            {preview.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        <fieldset disabled={busy || stale || planStale} className="recipe-form-fields">
          <CookQuantities
            rows={rows}
            onChange={(next) => {
              setRows(next);
              setChecked(false);
            }}
          />
          {!rows.length && (
            <p className="muted">
              No matching stocked packages. You can record this meal with no stock changes.
            </p>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            I checked these amounts. Zero leaves a package unchanged; unknown sizes are not
            inferred.
          </label>
        </fieldset>
        {planStale && (
          <p className="error" role="alert">
            The planned meal changed. Cancel and reopen it to review the current plan.
          </p>
        )}
        {stale && (
          <div role="alert">
            <p className="error">Your stock changed while this review was open.</p>
            <button className="secondary full" type="button" onClick={refresh}>
              Refresh amounts
            </button>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy || stale || planStale || !checked}>
          {busy ? 'Saving…' : 'Confirm cooked & update stock'}
        </button>
        <button className="text-button full" type="button" disabled={busy} onClick={onCancel}>
          Cancel without changes
        </button>
      </form>
    </Modal>
  );
}
