export const localTesting = import.meta.env.DEV && import.meta.env.VITE_LOCAL_TESTING === 'true';
export const requiresSignIn = (account: string) => account === 'local' && !localTesting;

let session: Promise<string> | undefined;
export function localToken(): Promise<string> {
  if (!localTesting || import.meta.env.VITE_API_URL !== '/api')
    return Promise.reject(new Error('Local testing is not configured.'));
  session ??= fetch('/api/v1/local/session', { credentials: 'omit', cache: 'no-store' })
    .then(async (response) => {
      const body: unknown = await response.json();
      if (
        !response.ok ||
        typeof body !== 'object' ||
        body === null ||
        !('token' in body) ||
        typeof body.token !== 'string' ||
        !/^[a-f0-9]{64}$/.test(body.token)
      )
        throw new Error('Reload the local preview to continue.');
      return body.token;
    })
    .catch((error: unknown) => {
      session = undefined;
      throw error;
    });
  return session;
}
