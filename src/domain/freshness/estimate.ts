import type { Food } from '../model';
import { matchArtwork } from '../artwork/match';
import { profiles } from './profiles';

export function reminderDays(
  food: Pick<Food, 'name' | 'location' | 'frozen' | 'unit'>,
): number | undefined {
  const place = food.frozen ? 'freezer' : food.location;
  if (
    place === 'unspecified' ||
    /\b(opened|leftover|cooked|cut|homemade|infant|formula|baby food)\b/i.test(food.name)
  )
    return undefined;
  const art = matchArtwork(food.name);
  if (art === 'plain-tin' && place === 'pantry' && food.unit === 'cans') return 730;
  return art ? profiles[art]?.[place] : undefined;
}
export function estimatedDate(
  food: Pick<Food, 'name' | 'location' | 'frozen' | 'unit'>,
  today: Date,
  aiDays?: number | null,
) {
  if (
    food.location === 'unspecified' ||
    /\b(infant|formula|baby food|opened|leftover|cooked|cut|homemade)\b/i.test(food.name)
  )
    return {};
  const hardcoded = reminderDays(food);
  const ai =
    aiDays && Number.isInteger(aiDays) && aiDays > 0
      ? Math.min(aiDays, food.frozen ? 365 : food.location === 'fridge' ? 4 : 730)
      : undefined;
  const days = hardcoded ?? ai;
  if (!days) return {};
  const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + days));
  return {
    expires: date.toISOString().slice(0, 10),
    expirySource: hardcoded ? ('estimate' as const) : ('ai' as const),
  };
}
