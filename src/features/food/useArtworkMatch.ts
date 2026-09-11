import { useState } from 'react';
import type { Food } from '../../domain/model';
import { matchArtwork } from '../../domain/artwork/match';

export function useArtworkMatch(food: Food, onChange: (food: Food) => void, enabled: boolean) {
  const [manual, setManual] = useState(false);
  return {
    value: enabled && !manual && food.art === 'generic' ? undefined : food.art,
    rename: (name: string) =>
      onChange({
        ...food,
        name,
        art: enabled && !manual ? (matchArtwork(name) ?? 'generic') : food.art,
      }),
    select: (art: Food['art']) => {
      setManual(true);
      onChange({ ...food, art });
    },
  };
}
