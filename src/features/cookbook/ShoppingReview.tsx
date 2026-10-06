import { useState } from 'react';
import type { ShoppingItem } from '../../domain/model';
import { useAction } from '../../ui/useAction';
import { amountLabel } from './presentation';

export interface ShoppingProposal {
  items: ShoppingItem[];
  error: string;
}
export function prepareShopping(prepare: () => ShoppingItem[]): ShoppingProposal {
  try {
    return { items: prepare(), error: '' };
  } catch (cause) {
    return {
      items: [],
      error: cause instanceof Error ? cause.message : 'Could not prepare the shopping list.',
    };
  }
}
export function ShoppingReview({
  proposal,
  onAdd,
}: {
  proposal: ShoppingProposal;
  onAdd: (items: ShoppingItem[]) => Promise<void>;
}) {
  const { run, error, busy } = useAction();
  const [added, setAdded] = useState(false);
  if (added) return <p role="status">Added to your shopping list.</p>;
  return (
    <>
      <p className="muted">
        Review the packages to buy. Unknown sizes need a check; optional ingredients are left out.
      </p>
      {proposal.error ? (
        <p className="error" role="alert">
          {proposal.error}
        </p>
      ) : (
        <>
          {proposal.items.length ? (
            <ul className="recipe-shopping-items">
              {proposal.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <span>
                    {amountLabel(item.quantity, item.unit)}
                    {item.packageSize ? ` · ${item.packageSize}` : ''}
                  </span>
                  {item.recipeNote && <span>{item.recipeNote}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Nothing to add. Check existing shopping entries for quantities that still need review.
            </p>
          )}
          <button
            className="secondary full"
            disabled={busy || !proposal.items.length}
            onClick={() =>
              void run(async () => {
                await onAdd(proposal.items);
                setAdded(true);
              })
            }
          >
            {busy
              ? 'Adding…'
              : `Add ${proposal.items.length} shopping item${proposal.items.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
