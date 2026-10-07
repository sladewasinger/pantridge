import { ChevronRight } from 'lucide-react';
import type { Recipe } from '../../domain/recipes/model';
import { recipeMeta } from './presentation';

const sources = { starter: 'Built-in', manual: 'Written', import: 'Imported', ai: 'AI' };
export function RecipeIndex({
  recipes,
  onOpen,
}: {
  recipes: Recipe[];
  onOpen: (id: string) => void;
}) {
  const ordered = [...recipes].sort((left, right) => left.title.localeCompare(right.title));
  return (
    <div className="recipe-index" aria-label="All recipes">
      <p className="muted cookbook-note">
        {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
      </p>
      {ordered.map((recipe) => (
        <button key={recipe.id} className="recipe-index-row" onClick={() => onOpen(recipe.id)}>
          <span className="recipe-index-copy">
            <strong>{recipe.title}</strong>
            <span>
              {recipeMeta(recipe)} <span aria-hidden="true">·</span> {sources[recipe.source]}
            </span>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
