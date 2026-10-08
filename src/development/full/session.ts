export const auth = null;
export const googleSignIn = false;
const key = 'pantridge-full-account';
const mode = import.meta.env.VITE_FULL_NAMESPACE;
export const selectedAccount = () =>
  sessionStorage.getItem(key) === 'dev-bob' ? 'dev-bob' : 'dev-alice';
export const fullAccount = () => `${mode}-${selectedAccount()}`;
let session: Promise<string> | undefined;
export async function initializeSession(): Promise<string> {
  return fullAccount();
}
export async function getToken(account: string): Promise<string> {
  if (
    !import.meta.env.DEV ||
    import.meta.env.VITE_LOCAL_FULL !== 'true' ||
    import.meta.env.VITE_API_URL !== '/api'
  )
    throw new Error('Full local sessions are unavailable.');
  if (account !== fullAccount()) throw new Error('The local test account changed.');
  session ??= fetch(`/api/v1/dev/session?account=${selectedAccount()}`, {
    cache: 'no-store',
    headers: { 'X-Pantridge-Local': 'session' },
  })
    .then(async (response) => {
      const body = (await response.json()) as { token?: string; owner?: string };
      if (
        !response.ok ||
        body.owner !== selectedAccount() ||
        !/^[a-f0-9]{64}$/.test(body.token ?? '')
      )
        throw new Error('Reload the local preview to renew its test session.');
      return body.token!;
    })
    .catch((error: unknown) => {
      session = undefined;
      throw error;
    });
  const token = await session;
  if (account !== fullAccount()) throw new Error('The local test account changed.');
  return token;
}
export function selectAccount(value: string) {
  if (!['dev-alice', 'dev-bob'].includes(value)) throw new Error('Invalid test account.');
  sessionStorage.setItem(key, value);
  window.location.reload();
}
export async function signOut(): Promise<void> {
  selectAccount('dev-alice');
}
