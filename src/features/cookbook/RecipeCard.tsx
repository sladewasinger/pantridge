import { Bookmark, ChevronRight } from 'lucide-react';
import type { RecipeBrowseMatch } from '../../domain/recipes/ranking';
import { dateLabel, recipeMeta } from './presentation';

function matchLabel(match: RecipeBrowseMatch) {
  const { coverage } = match;
  if (coverage.section === 'unmatched') return 'No ingredients on hand';
  if (coverage.section === 'partial')
    return `${coverage.onHand} of ${coverage.required} on hand${coverage.possible ? ` · ${coverage.possible} possible` : ''}`;
  if (match.status === 'needs-review') return 'Check amounts';
  return match.recipe.untrackedIngredients?.length
    ? 'Check extra ingredients'
    : 'Ingredients on hand';
}
export function RecipeCard({
  match,
  saved,
  useSoon,
  onOpen,
}: {
  match: RecipeBrowseMatch;
  saved: boolean;
  useSoon?: string;
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
            'Built-in'
          )}
        </span>
        <span className="recipe-card-title">{match.recipe.title}</span>
        <span className="recipe-meta">{recipeMeta(match.recipe)}</span>
        <span className={`recipe-match ${useSoon ? 'use-soon' : match.status}`}>
          {useSoon ? `Use soon · ${dateLabel(useSoon)}` : matchLabel(match)}
        </span>
        {match.pastDate > 0 && <span className="recipe-use-up">Check past-date ingredients</span>}
      </span>
      <ChevronRight size={19} />
    </button>
  );
}
