let pending: Promise<unknown> = Promise.resolve();

// Refresh, callback storage and sign-out share one lock, including across tabs.
export function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  const run = () =>
    navigator.locks ? navigator.locks.request('pantridge-oidc-session', action) : action();
  const result = pending.then(run, run);
  pending = result.catch(() => undefined);
  return result;
}
