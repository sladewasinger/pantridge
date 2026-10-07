import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import { usePreferences } from '../recipe-preferences/usePreferences';
import { useDietReview } from './useDietReview';
import { useKitchen } from '../../data/store';
import { withCalculatedNutrition } from '../../domain/recipe-nutrition/calculate';

export function useVariations(original: Recipe) {
  const [draft, setDraft] = useState<Recipe>();
  const { preferences } = usePreferences();
  const { data } = useKitchen();
  const current = draft ?? original;
  const recipe =
    current.nutrition?.source === 'publisher' ? current : withCalculatedNutrition(data, current);
  const diet = useDietReview(recipe, preferences);
  return {
    recipe,
    preferences,
    diet,
    changed: Boolean(draft),
    onChange: setDraft,
    onUndo: () => setDraft(undefined),
  };
}
