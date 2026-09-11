import { useId, useState, type ReactNode } from 'react';
import type { Product } from '../../domain/products/barcode';
import { NutritionPanel } from './NutritionPanel';

export function ItemTabs({ children, products }: { children: ReactNode; products: Product[] }) {
  const [tab, setTab] = useState(0);
  const id = useId();
  return (
    <>
      <div className="item-tabs" role="tablist" aria-label="Item information">
        {['Item', 'Nutrition'].map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
              setTab(next);
              event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={tab !== 0}>
        {children}
      </div>
      <div role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={tab !== 1}>
        <NutritionPanel products={products} />
      </div>
    </>
  );
}
