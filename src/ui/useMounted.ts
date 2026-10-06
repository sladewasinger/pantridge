import { useEffect, useRef } from 'react';

// Async work may commit after Back/Close unmounts a form. Its completion must not
// dismiss a newer dialog or replace a newer draft in a still-mounted parent.
export function useMounted() {
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return () => active.current;
}
