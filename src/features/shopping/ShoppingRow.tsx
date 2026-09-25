import { GripVertical } from 'lucide-react';
import type { Food, ShoppingItem } from '../../domain/model';
import { units } from '../../domain/selectors';
import type { useShoppingReorder } from './useShoppingReorder';
import { ShoppingInfo } from './ShoppingInfo';

export function ShoppingRow({
  item,
  food,
  have,
  busy,
  onEdit,
  onPurchase,
  reorder,
}: {
  item: ShoppingItem;
  food?: Food;
  have: number;
  busy: boolean;
  onEdit: (item: ShoppingItem) => void;
  onPurchase: (purchased: boolean) => void;
  reorder: Omit<ReturnType<typeof useShoppingReorder>, 'root'>;
}) {
  const size = item.packageSize;
  return (
    <div
      data-shopping-id={item.id}
      className={`shop-row ${item.purchased ? 'purchased' : ''} ${reorder.dragId === item.id ? 'is-dragging' : ''}`}
    >
      <button
        className="shopping-grip"
        aria-label={`Reorder ${item.name}`}
        aria-describedby={reorder.instructions}
        disabled={busy}
        onPointerDown={(event) => reorder.start(event, item)}
        onPointerMove={reorder.move}
        onPointerUp={reorder.finish}
        onPointerCancel={reorder.cancel}
        onLostPointerCapture={reorder.cancel}
        onKeyDown={(event) => reorder.keyboard(event, item)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <GripVertical size={18} />
      </button>
      <label className="purchase-target">
        <input
          type="checkbox"
          aria-label={`Mark ${item.name} purchased`}
          checked={item.purchased}
          disabled={busy}
          onChange={(e) => onPurchase(e.target.checked)}
        />
      </label>
      <ShoppingInfo item={item} food={food} have={have} onEdit={onEdit} />
      <button
        className="buy-quantity"
        onClick={() => onEdit(item)}
        aria-label={`Buy ${size ? `${item.quantity} × ${size}` : units(item.quantity, item.unit)} of ${item.name}`}
      >
        <span>{item.quantity}</span>
        {size && <small aria-hidden="true">×</small>}
      </button>
    </div>
  );
}
