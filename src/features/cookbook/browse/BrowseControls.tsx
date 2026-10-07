import { FileInput, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { BrowsePreferences } from './preferences';

export function BrowseControls({
  value,
  onChange,
  onImport,
  onSuggest,
}: {
  value: BrowsePreferences;
  onChange: (value: BrowsePreferences) => void;
  onImport: () => void;
  onSuggest: () => void;
}) {
  return (
    <div className="cookbook-browse-tools">
      <details className="cookbook-view">
        <summary>
          <SlidersHorizontal size={16} />
          View
        </summary>
        <div className="cookbook-view-panel">
          <label>
            Order recipes
            <select
              value={value.order}
              onChange={(event) =>
                onChange({ ...value, order: event.target.value as BrowsePreferences['order'] })
              }
            >
              <option value="use-soon">Use soon</option>
              <option value="on-hand">Ingredients on hand</option>
              <option value="quick">Quickest first</option>
              <option value="name">A to Z</option>
            </select>
          </label>
          <label className="cookbook-view-toggle">
            <input
              type="checkbox"
              checked={value.builtIns}
              onChange={(event) => onChange({ ...value, builtIns: event.target.checked })}
            />
            Include built-in recipes
          </label>
          <label className="cookbook-view-toggle">
            <input
              type="checkbox"
              checked={value.quickOnly}
              onChange={(event) => onChange({ ...value, quickOnly: event.target.checked })}
            />
            30 minutes or less
          </label>
          <button className="text-button" onClick={onImport}>
            <FileInput size={16} />
            Import a recipe
          </button>
        </div>
      </details>
      <button
        className="text-button cookbook-ideas"
        onClick={onSuggest}
        aria-label="Suggest with AI"
      >
        <Sparkles size={16} />
        Get ideas
      </button>
    </div>
  );
}
