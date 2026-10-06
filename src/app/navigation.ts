import type { Location, ShoppingItem } from '../domain/model';
export type Page = 'kitchen' | 'shopping' | 'cookbook';
export type StoragePage = Location | 'freezer';
export type Overlay =
  | { type: 'food'; id: string }
  | { type: 'add'; shelf?: number; location?: Location }
  | { type: 'shopping'; item?: ShoppingItem }
  | { type: 'put-away' }
  | { type: 'settings' }
  | { type: 'scan' }
  | { type: 'recipe'; id: string; planEntryId?: string }
  | { type: 'recipe-edit'; id?: string }
  | { type: 'recipe-import' }
  | { type: 'recipe-suggest' };
export interface ViewState {
  page: Page;
  location: StoragePage | null;
  query: string;
}
export function viewTitle({ page, location, query }: ViewState): string {
  if (page === 'shopping') return 'Shopping';
  if (page === 'cookbook') return 'Cookbook';
  if (query) return 'Find your food';
  if (location === 'fridge') return 'Fridge';
  if (location === 'pantry') return 'Pantry';
  if (location === 'freezer') return 'Freezer';
  if (location === 'unspecified') return 'Storage';
  return 'My kitchen';
}
