import type { Location, ShoppingItem } from '../domain/model';
export type Page = 'kitchen' | 'shopping';
export type StoragePage = Location | 'freezer';
export type Overlay =
  | { type: 'food'; id: string }
  | { type: 'add'; shelf?: number }
  | { type: 'shopping'; item?: ShoppingItem }
  | { type: 'put-away' }
  | { type: 'settings' }
  | { type: 'scan' };
export interface ViewState {
  page: Page;
  location: StoragePage | null;
  query: string;
}
export function viewTitle({ page, location, query }: ViewState): string {
  if (page === 'shopping') return 'Shopping';
  if (query) return 'Find your food';
  if (location === 'fridge') return 'Fridge';
  if (location === 'pantry') return 'Pantry';
  if (location === 'freezer') return 'Freezer';
  return 'My kitchen';
}
