import type { RecognitionReview } from '../../domain/standardization/review';
import {
  ingredientLabel,
  ingredientRegistry,
  customIngredient,
} from '../../domain/ingredient-matching/identity';
import { preparationSchema, type IngredientIdentity } from '../../domain/ingredient-matching/model';

export function initialClarification(review: RecognitionReview) {
  if (review.result && review.result.status !== 'recognized') return undefined;
  return review.identity?.id.startsWith('custom-') ? undefined : review.identity;
}
export function canClarify(identity?: IngredientIdentity) {
  return Boolean(
    identity && (identity.id.startsWith('custom-') || identity.preparation !== 'unknown'),
  );
}
export function ClarificationFields({
  review,
  identity,
  disabled,
  onChange,
}: {
  review: RecognitionReview;
  identity?: IngredientIdentity;
  disabled: boolean;
  onChange: (identity: IngredientIdentity | undefined) => void;
}) {
  const exact = identity?.id.startsWith('custom-');
  const choose = (id: string) =>
    onChange(
      id === 'exact'
        ? customIngredient(review.name)
        : id
          ? { id, preparation: 'unknown', basis: review.identity?.basis ?? 'as-sold' }
          : undefined,
    );
  const selector = (
    <label>
      What food is this?
      <select
        value={exact ? 'exact' : (identity?.id ?? '')}
        onChange={(e) => choose(e.target.value)}
        disabled={disabled}
      >
        <option value="">Choose an ingredient</option>
        <option value="exact">Keep exact name · {review.name}</option>
        {ingredientRegistry.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      {initialClarification(review) ? (
        <>
          <p>Ingredient: {identity ? ingredientLabel(identity.id) : 'Choose below'}</p>
          <details>
            <summary>Change ingredient</summary>
            {selector}
          </details>
        </>
      ) : (
        selector
      )}
      {identity && !exact && (
        <label>
          How is it prepared?
          <select
            value={identity.preparation}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...identity, preparation: preparationSchema.parse(e.target.value) })
            }
          >
            <option value="unknown">Not sure yet</option>
            <option value="raw">Raw</option>
            <option value="dry">Dry / dried</option>
            <option value="cooked">Cooked / ready to eat</option>
            <option value="canned">Canned</option>
            <option value="frozen">Frozen</option>
            <option value="plain">Plain / no preparation distinction</option>
            {review.key.startsWith('recipe:') && (
              <option value="any">Any preparation works in this recipe</option>
            )}
          </select>
        </label>
      )}
    </>
  );
}
