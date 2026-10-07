import { getAccount } from '../../../data/store';
import { localTesting } from '../../../local-testing';

export type RecipeOrder = 'use-soon' | 'on-hand' | 'name' | 'quick';
export interface BrowsePreferences {
  order: RecipeOrder;
  builtIns: boolean;
  quickOnly: boolean;
}
export const defaultPreferences: BrowsePreferences = {
  order: 'use-soon',
  builtIns: true,
  quickOnly: false,
};
const key = () => `pantridge.cookbook.${localTesting ? 'local-test' : 'standard'}.${getAccount()}`;
export function readPreferences(): BrowsePreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key()) ?? 'null');
    if (!value || typeof value !== 'object') return { ...defaultPreferences };
    const preference = value as Partial<BrowsePreferences>;
    return {
      order: ['use-soon', 'on-hand', 'name', 'quick'].includes(preference.order ?? '')
        ? preference.order!
        : 'use-soon',
      builtIns: preference.builtIns !== false,
      quickOnly: preference.quickOnly === true,
    };
  } catch {
    return { ...defaultPreferences };
  }
}
export function storePreferences(value: BrowsePreferences): void {
  try {
    localStorage.setItem(key(), JSON.stringify(value));
  } catch {
    /* Browsing remains usable without preference storage. */
  }
}
