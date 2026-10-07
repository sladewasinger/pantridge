import { useState } from 'react';
import type { Recipe } from '../../domain/recipes/model';
import type { RecipePreferences } from '../../domain/recipe-preferences/model';
import { assessRecipeDiet } from '../../domain/recipe-preferences/assessment';
import { dietReviewKey } from '../../domain/recipe-preferences/review';
import { getKitchen, useKitchen } from '../../data/store';

export function useDietReview(recipe: Recipe, preferences: RecipePreferences) {
  const { data } = useKitchen();
  const [acknowledged, setAcknowledged] = useState('');
  const [required, setRequired] = useState(false);
  const key = dietReviewKey(recipe, preferences, data);
  const checked = acknowledged === key;
  const check = (next: Recipe) => {
    if (!preferences.restrictions.length) return true;
    const assessment = assessRecipeDiet(next, preferences);
    const ready =
      !assessment.conflicts.length &&
      acknowledged === dietReviewKey(next, preferences, getKitchen().data);
    setRequired(!ready);
    return ready;
  };
  return {
    checked,
    check,
    required,
    onChange: (value: boolean) => {
      setAcknowledged(value ? key : '');
      setRequired(false);
    },
  };
}
