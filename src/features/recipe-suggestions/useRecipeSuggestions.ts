import { useEffect, useRef, useState } from 'react';
import { getAccount, getKitchen } from '../../data/store';
import type { Recipe } from '../../domain/recipes/model';
import { buildSuggestionContext } from '../../domain/recipe-suggestions/grounding';
import { withCalculatedNutrition } from '../../domain/recipe-nutrition/calculate';
import { usePreferences } from '../recipe-preferences/usePreferences';
import { useAction } from '../../ui/useAction';
import { todayLocal } from '../cookbook/presentation';
import { requestRecipeSuggestions } from './client';

export function useRecipeSuggestions() {
  const [account] = useState(getAccount);
  const [useUp, setUseUp] = useState(true);
  const { preferences, changePreferences } = usePreferences();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [basis, setBasis] = useState('');
  const controller = useRef<AbortController | null>(null);
  const { run, busy, error } = useAction();
  useEffect(() => () => controller.current?.abort(), []);
  const generate = () =>
    run(async () => {
      if (account !== getAccount()) throw new Error('Your kitchen changed. Reopen the cookbook.');
      const { request: input, foundations } = buildSuggestionContext(
        getKitchen().data,
        useUp,
        preferences,
        todayLocal(),
      );
      if (!input.inventory.length)
        throw new Error('Add food to your kitchen before requesting recipes.');
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setRecipes(null);
      try {
        const result = await requestRecipeSuggestions(input, account, request.signal);
        request.signal.throwIfAborted();
        // Fresh local IDs prevent a cached suggestion from overwriting an edited saved recipe.
        setRecipes(
          result.map((recipe) => {
            const base = foundations[recipe.generation?.basisKey ?? 'none'];
            return withCalculatedNutrition(getKitchen().data, {
              ...recipe,
              ...(base
                ? {
                    sourceUrl: base.sourceUrl,
                    generation: { ...recipe.generation!, baseTitle: base.title },
                  }
                : {}),
              id: crypto.randomUUID(),
              ingredients: recipe.ingredients.map((ingredient) => ({
                ...ingredient,
                id: crypto.randomUUID(),
              })),
            });
          }),
        );
        setBasis(JSON.stringify(input));
      } catch (cause) {
        if (!request.signal.aborted) throw cause;
      }
    });
  return {
    account,
    useUp,
    setUseUp,
    preferences,
    changePreferences,
    recipes,
    basis,
    generate,
    busy,
    error,
  };
}
