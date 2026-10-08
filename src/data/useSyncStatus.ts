import { useEffect, useState } from 'react';
import { syncStatus } from './sync';

export function useSyncStatus() {
  const [state, setState] = useState(syncStatus);
  useEffect(() => {
    const update = () => setState(syncStatus());
    window.addEventListener('pantridge-sync', update);
    return () => window.removeEventListener('pantridge-sync', update);
  }, []);
  return state;
}
