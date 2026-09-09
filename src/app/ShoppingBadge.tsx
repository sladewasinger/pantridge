import { useKitchen } from '../data/store';

export function ShoppingBadge() {
  const { data } = useKitchen();
  const count = data.shopping.filter((item) => !item.purchased).length;
  return (
    <>
      {count > 0 && (
        <span className="shopping-badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span id="shopping-count" className="sr-only">
        {count} items to buy
      </span>
    </>
  );
}
