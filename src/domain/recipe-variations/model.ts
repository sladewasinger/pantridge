import type { RecipeIngredient } from '../recipes/model';
export interface RecipeVariation {
  id: string;
  label: string;
  why: string;
  preparation: string;
  ingredient: Omit<RecipeIngredient, 'id'>;
  replaces?: string;
  minutes: number;
  stocked: boolean;
}
