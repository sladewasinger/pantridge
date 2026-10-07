import { useState } from 'react';
import {
  emptyPreferences,
  recipePreferencesSchema,
  type RecipePreferences,
} from '../../domain/recipe-preferences/model';
import { getAccount } from '../../data/store';

export function readPreferences(account = getAccount()): RecipePreferences {
  try {
    const parsed = recipePreferencesSchema.safeParse(
      JSON.parse(
        localStorage.getItem(`pantridge:recipe-preferences:${account ?? 'device'}`) ?? 'null',
      ),
    );
    return parsed.success ? parsed.data : emptyPreferences();
  } catch {
    return emptyPreferences();
  }
}
export function usePreferences() {
  const [account] = useState(getAccount);
  const [preferences, setPreferences] = useState(() => readPreferences(account));
  const changePreferences = (next: RecipePreferences) => {
    if (account !== getAccount()) return;
    setPreferences(next);
    const parsed = recipePreferencesSchema.safeParse(next);
    if (!parsed.success) return;
    try {
      localStorage.setItem(
        `pantridge:recipe-preferences:${account ?? 'device'}`,
        JSON.stringify(parsed.data),
      );
    } catch {
      /* Device storage may be unavailable; current choices still work. */
    }
  };
  return { preferences, changePreferences };
}
