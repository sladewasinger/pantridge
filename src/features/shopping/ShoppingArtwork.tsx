import type { Food, ShoppingItem } from '../../domain/model';
import { artwork } from '../../domain/artwork/catalog';
import { matchArtwork } from '../../domain/artwork/match';
import { ArtPicker } from '../food/ArtPicker';

export function ShoppingArtwork({
  item,
  food,
  onChange,
}: {
  item: ShoppingItem;
  food?: Food;
  onChange: (item: ShoppingItem) => void;
}) {
  const value = item.art ?? food?.art ?? matchArtwork(item.name);
  const selected = artwork.find((art) => art.id === value);
  return (
    <details className="shopping-artwork">
      <summary>
        {selected && <img src={selected.src} alt={selected.label} />}
        <span>Change artwork</span>
      </summary>
      <ArtPicker value={value} onChange={(art) => onChange({ ...item, art })} />
      {item.art && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            const { art: _art, ...automatic } = item;
            onChange(automatic);
          }}
        >
          Use automatic artwork
        </button>
      )}
    </details>
  );
}
