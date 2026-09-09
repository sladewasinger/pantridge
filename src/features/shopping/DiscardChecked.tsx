import { dispatchMany, getAccount, getKitchen } from '../../data/store';
import { showUndo } from '../../ui/notice';
import { useAction } from '../../ui/useAction';

export function DiscardChecked() {
  const { run, busy, error } = useAction();
  return (
    <>
      <button
        className="text-button full"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const account = getAccount();
            const items = getKitchen().data.shopping.filter((item) => item.purchased);
            await dispatchMany(
              items.map((item) => ({ type: 'shopping.discard', itemId: item.id })),
            );
            if (getAccount() !== account) return;
            showUndo(`${items.length} checked items discarded`, async () => {
              if (getAccount() !== account) throw new Error('Switch back to this kitchen to undo.');
              await dispatchMany(items.map((item) => ({ type: 'shopping.restore', item })));
            });
          })
        }
      >
        Discard checked items
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
