import {
  directions,
  emptyPreferences,
  preferenceTargets,
  type RecipePreferences as Preferences,
} from '../../domain/recipe-preferences/model';
import { PreferenceOptions } from './PreferenceOptions';

const labels = {
  quick: 'Quick',
  'high-protein': 'High protein',
  'lower-carb': 'Lower carb',
  comfort: 'Comfort',
  'one-pan': 'One pan',
};
export function RecipePreferences({
  value,
  disabled,
  onChange,
}: {
  value: Preferences;
  disabled: boolean;
  onChange: (next: Preferences) => void;
}) {
  const targets = preferenceTargets(value);
  return (
    <fieldset disabled={disabled} className="recipe-preferences">
      <legend>
        What sounds good? <span className="optional">optional</span>
      </legend>
      <div className="recipe-direction-chips">
        {directions.map((direction) => (
          <button
            type="button"
            className="secondary"
            aria-pressed={value.directions.includes(direction)}
            key={direction}
            disabled={!value.directions.includes(direction) && value.directions.length >= 3}
            onClick={() =>
              onChange({
                ...value,
                directions: value.directions.includes(direction)
                  ? value.directions.filter((item) => item !== direction)
                  : [...value.directions, direction],
              })
            }
          >
            {labels[direction]}
          </button>
        ))}
      </div>
      {(targets.minutes || targets.protein || targets.carbs) && (
        <p className="muted recipe-targets">
          {[
            targets.minutes ? `≤ ${targets.minutes} min` : '',
            targets.protein ? `≥ ${targets.protein} g protein/serving` : '',
            targets.carbs ? `≤ ${targets.carbs} g carbs/serving` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
          . Estimates are checked after generation.
        </p>
      )}
      <details>
        <summary>
          More preferences
          {value.restrictions.length ? ` · ${value.restrictions.length} dietary choices` : ''}
        </summary>
        <PreferenceOptions value={value} onChange={onChange} />
        <p className="muted">
          Saved for this kitchen on this device. Selected constraints go to OpenAI when you request
          ideas.
        </p>
        <button type="button" className="text-button" onClick={() => onChange(emptyPreferences())}>
          Reset preferences
        </button>
      </details>
    </fieldset>
  );
}
