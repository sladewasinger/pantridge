import { Bookmark, ChevronRight } from 'lucide-react';
import type { getRecipeAvailability } from '../../domain/recipes/availability';
import { recipeMeta } from './presentation';

type Availability = ReturnType<typeof getRecipeAvailability>;
const matchLabels = {
  confirmed: 'Ingredients on hand',
  'needs-review': 'Check amounts',
  missing: 'Ingredients to get',
};
export function RecipeCard({
  match,
  saved,
  onOpen,
}: {
  match: Availability;
  saved: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <button className="recipe-card" onClick={() => onOpen(match.recipe.id)}>
      <span className="recipe-card-copy">
        <span className="recipe-source">
          {saved ? (
            <>
              <Bookmark size={12} /> Saved recipe
            </>
          ) : (
            'From the starter collection'
          )}
        </span>
        <span className="recipe-card-title">{match.recipe.title}</span>
        <span className="recipe-meta">{recipeMeta(match.recipe)}</span>
        <span className={`recipe-match ${match.status}`}>{matchLabels[match.status]}</span>
        {match.expiringSoon > 0 && <span className="recipe-use-up">Uses dated ingredients</span>}
        {match.pastDate > 0 && <span className="recipe-use-up">Check past-date ingredients</span>}
      </span>
      <ChevronRight size={19} />
    </button>
  );
}
