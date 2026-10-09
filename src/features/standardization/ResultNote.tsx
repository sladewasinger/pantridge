import {
  standardizationVersion,
  type SavedStandardization,
} from '../../domain/standardization/model';
const descriptions = {
  uncertain: 'Food identity uncertain.',
  unknown: 'No ingredient match.',
  'taxonomy-gap': 'Ingredient outside the recipe catalog.',
  composite: 'Mixed food.',
  nonfood: 'Nonfood item.',
};
export function ResultNote({ result, manual }: { result?: SavedStandardization; manual: boolean }) {
  if (manual || !result) return null;
  if (result.status !== 'recognized' && result.version !== standardizationVersion) return null;
  return (
    <p className="muted">
      {result.status === 'recognized' && result.preparation === 'unknown'
        ? 'AI ingredient match · preparation unspecified.'
        : result.status === 'recognized'
          ? 'AI ingredient match.'
          : descriptions[result.status]}
    </p>
  );
}
