import type { SavedStandardization } from '../../domain/standardization/model';
export function ResultNote({ result, manual }: { result?: SavedStandardization; manual: boolean }) {
  if (manual || !result) return null;
  return (
    <p className="muted">
      {result.status === 'recognized' && result.preparation === 'unknown'
        ? 'Ingredient recognized. Choose its preparation below.'
        : result.status === 'recognized'
          ? 'AI recognized · check preparation and package amounts.'
          : `Needs review · ${result.reason || result.status}`}
    </p>
  );
}
