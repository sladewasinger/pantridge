import { Home } from 'lucide-react';
import type { Food, ShoppingItem } from '../../domain/model';
import { artPath } from '../../domain/artwork/catalog';
import { matchArtwork } from '../../domain/artwork/match';
import { units } from '../../domain/selectors';

export function ShoppingInfo({
  item,
  food,
  have,
  onEdit,
}: {
  item: ShoppingItem;
  food?: Food;
  have: number;
  onEdit: (item: ShoppingItem) => void;
}) {
  const art = item.art ?? food?.art ?? matchArtwork(item.name);
  const packageUnit =
    item.unit === 'items' ? '' : units(item.quantity, item.unit).replace(/^\d+ /, '');
  const size = item.packageSize || packageUnit;
  return (
    <button className="shop-info" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
      {art && <img className="shop-art" src={artPath(art)} alt="" />}
      <span className="shop-copy">
        <span className="shop-name">
          {item.name}
          {size && <small className="shop-size"> · {size}</small>}
        </span>
        {item.foodId && (
          <span className="home-stock">
            <Home size={12} />
            <span className="sr-only">At home: </span>
            {item.unit === 'items' ? have : units(have, item.unit)}
          </span>
        )}
      </span>
    </button>
  );
}
