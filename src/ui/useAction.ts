import { useState } from 'react';
export function useAction() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save that change. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run };
}
