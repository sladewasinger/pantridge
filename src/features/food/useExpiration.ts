import { useState } from 'react';
import type { Food } from '../../domain/model';
import { estimatedDate } from '../../domain/freshness/estimate';
import { isSupply } from '../../domain/supplies';

export function useExpiration(food: Food, aiDays?: number | null) {
  const [today] = useState(() => new Date());
  const [manual, setManual] = useState<string>();
  const automatic = estimatedDate(food, today, aiDays);
  const value = manual ?? automatic.expires ?? '';
  const source = manual === undefined ? automatic.expirySource : undefined;
  return {
    value,
    source,
    set: setManual,
    fields:
      value && !isSupply(food)
        ? { expires: value, ...(source ? { expirySource: source } : {}) }
        : {},
  };
}
