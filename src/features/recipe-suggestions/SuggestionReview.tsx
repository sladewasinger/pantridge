import { useRef, useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { ingredientChoices } from '../../domain/recipe-suggestions/choices';
import { getRecipes } from '../../domain/recipes/selectors';
import { dispatch, getAccount, getKitchen, useKitchen } from '../../data/store';
import { useAction } from '../../ui/useAction';
import { useMounted } from '../../ui/useMounted';
import { RecipeEditor } from '../cookbook/RecipeEditor';
import { todayLocal } from '../cookbook/presentation';
import { IngredientChoices } from './IngredientChoices';
import { SuggestionPreview } from './SuggestionPreview';

export function SuggestionReview({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { data } = useKitchen();
  const [account] = useState(getAccount);
  const [originalChoices] = useState(() => ingredientChoices(data, recipe, todayLocal()));
  const [needed, setNeeded] = useState(originalChoices);
  const [pending, setPending] = useState<Recipe>();
  const [resolved, setResolved] = useState<Recipe>();
  const [mode, setMode] = useState<'read' | 'choose' | 'edit'>('read');
  const navigation = useRef(0);
  const show = (next: typeof mode) => {
    navigation.current++;
    setMode(next);
  };
  const { run, busy, error } = useAction();
  const isMounted = useMounted();
  const saved = getRecipes(data).find((item) => item.id === recipe.id);
  const shown = pending ?? saved ?? resolved ?? recipe;
  const persist = async (next: Recipe) => {
    if (getAccount() !== account) throw new Error('Your kitchen changed. Reopen this recipe.');
    const startedAt = navigation.current;
    await dispatch({ type: 'recipe.save', recipe: next });
    if (isMounted() && getAccount() === account && navigation.current === startedAt) {
      setPending(undefined);
      setResolved(next);
      show('read');
    }
  };
  const requestSave = async (next: Recipe) => {
    if (getAccount() !== account) throw new Error('Your kitchen changed. Reopen this recipe.');
    const available = ingredientChoices(getKitchen().data, next, todayLocal());
    if (
      originalChoices.some(
        ({ ingredient }) =>
          next.ingredients.some(
            (item) => item.id === ingredient.id && item.name === ingredient.name,
          ) && !available.some((item) => item.ingredient.id === ingredient.id),
      )
    )
      throw new Error('Your stock changed. Reopen this recipe to review the ingredients.');
    if (available.length) {
      setPending(next);
      setNeeded(available);
      show('choose');
    } else await persist(next);
  };
  if (mode === 'edit')
    return <RecipeEditor recipe={shown} onSave={requestSave} onClose={() => show('read')} />;
  if (mode === 'choose')
    return (
      <IngredientChoices
        recipe={shown}
        needed={needed}
        onSave={persist}
        onClose={() => show('read')}
      />
    );
  return (
    <SuggestionPreview
      recipe={shown}
      busy={busy}
      saved={Boolean(saved)}
      error={error}
      onClose={onClose}
      onEdit={() => show('edit')}
      onSave={() => void run(() => requestSave(shown))}
    />
  );
}
