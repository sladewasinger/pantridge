import { Check } from 'lucide-react';
import { artSchema, type Food } from '../../domain/model';

const names: Record<Food['art'], string> = {
  eggs: 'Egg carton',
  milk: 'Milk carton',
  butter: 'Butter',
  can: 'Can',
  pasta: 'Pasta box',
  rice: 'Rice bag',
  oats: 'Oats tub',
  greens: 'Leafy greens',
  yogurt: 'Yogurt cup',
  generic: 'Grocery bag',
  bread: 'Bread',
  apple: 'Apple',
  carrots: 'Carrots',
  fish: 'Fish',
};
export function ArtPicker({
  value,
  onChange,
}: {
  value: Food['art'];
  onChange: (art: Food['art']) => void;
}) {
  return (
    <fieldset className="art-field">
      <legend>Illustration</legend>
      <div className="art-picker">
        {artSchema.options.map((art) => (
          <button
            key={art}
            type="button"
            aria-label={`Use ${names[art]} artwork`}
            aria-pressed={value === art}
            title={names[art]}
            onClick={() => onChange(art)}
          >
            <img src={`/art/${art}.svg`} alt="" draggable="false" />
            {value === art && <Check size={12} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
