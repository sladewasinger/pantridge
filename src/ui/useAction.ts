import { useRef, useState } from 'react';
export function useAction() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  async function run(action: () => Promise<void>) {
    if (active.current) return;
    active.current = true;
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save that change. Please try again.',
      );
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return { error, busy, run };
}
