import { Fragment } from 'react';
import { BookOpen } from 'lucide-react';
import type { Snapshot } from '../../../domain/model';
import type { RecipeBrowseMatch } from '../../../domain/recipes/ranking';
import { soonestDate } from '../../../domain/recipes/browse';
import { RecipeCard } from '../RecipeCard';

const sectionNames = {
  'on-hand': 'Ingredients on hand',
  partial: 'Partial matches',
  unmatched: 'More recipes',
};
export function RecipeList({
  matches,
  saved,
  data,
  today,
  onOpen,
  empty,
}: {
  matches: RecipeBrowseMatch[];
  saved: Set<string>;
  data: Snapshot;
  today: string;
  onOpen: (id: string) => void;
  empty: string;
}) {
  return (
    <div className="recipe-list">
      {matches.map((match, index) => (
        <Fragment key={match.recipe.id}>
          {match.coverage.section !== matches[index - 1]?.coverage.section && (
            <h3 className="recipe-section-heading">{sectionNames[match.coverage.section]}</h3>
          )}
          <RecipeCard
            match={match}
            saved={saved.has(match.recipe.id)}
            useSoon={soonestDate(data, match, today)}
            onOpen={onOpen}
          />
        </Fragment>
      ))}
      {!matches.length && (
        <div className="empty-state">
          <BookOpen size={30} />
          <h3>No kitchen matches</h3>
          <p>{empty}</p>
        </div>
      )}
    </div>
  );
}
