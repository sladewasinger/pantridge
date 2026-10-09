export class SignInRequiredError extends Error {
  constructor() {
    super('Sign in again with the same account to sync. Your changes are saved on this device.');
    this.name = 'SignInRequiredError';
  }
}

const interactiveErrors = new Set([
  'invalid_grant',
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
]);
export function requiresSignIn(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'string' &&
    interactiveErrors.has(error.error)
  );
}

export function requestSignIn(account: string): SignInRequiredError {
  window.dispatchEvent(new CustomEvent('pantridge-signin', { detail: account }));
  return new SignInRequiredError();
}
