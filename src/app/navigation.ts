import type { Location, ShoppingItem } from '../domain/model';
export type Page = 'kitchen' | 'shopping';
export type Overlay =
  | { type: 'food'; id: string }
  | { type: 'add' }
  | { type: 'shopping'; item?: ShoppingItem }
  | { type: 'put-away' }
  | { type: 'settings' };
export interface ViewState {
  page: Page;
  location: Location | null;
  query: string;
}
export function viewTitle({ page, location, query }: ViewState): string {
  if (page === 'shopping') return 'Shopping';
  if (query) return 'Find your food';
  if (location === 'fridge') return 'Fridge';
  if (location === 'pantry') return 'Pantry';
  return 'My kitchen';
}
