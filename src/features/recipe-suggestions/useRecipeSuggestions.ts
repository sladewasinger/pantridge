import { useEffect, useRef, useState } from 'react';
import { getAccount, getKitchen } from '../../data/store';
import type { Recipe } from '../../domain/recipes/model';
import { buildRecipeSuggestionRequest } from '../../domain/recipe-suggestions/inventory';
import { useAction } from '../../ui/useAction';
import { todayLocal } from '../cookbook/presentation';
import { requestRecipeSuggestions } from './client';

export function useRecipeSuggestions() {
  const [account] = useState(getAccount);
  const [useUp, setUseUp] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [basis, setBasis] = useState('');
  const controller = useRef<AbortController | null>(null);
  const { run, busy, error } = useAction();
  useEffect(() => () => controller.current?.abort(), []);
  const generate = () =>
    run(async () => {
      if (account !== getAccount()) throw new Error('Your kitchen changed. Reopen the cookbook.');
      const input = buildRecipeSuggestionRequest(getKitchen().data, useUp, todayLocal());
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
          result.map((recipe) => ({
            ...recipe,
            id: crypto.randomUUID(),
            ingredients: recipe.ingredients.map((ingredient) => ({
              ...ingredient,
              id: crypto.randomUUID(),
            })),
          })),
        );
        setBasis(JSON.stringify(input));
      } catch (cause) {
        if (!request.signal.aborted) throw cause;
      }
    });
  return { account, useUp, setUseUp, recipes, basis, generate, busy, error };
}
