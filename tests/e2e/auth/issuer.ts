import { createHash } from 'node:crypto';
import { expect, type BrowserContext } from '@playwright/test';

export const authority = 'https://auth.pantridge.test';
export const clientId = 'pantridge-test';
export const userKey = `oidc.user:${authority}:${clientId}`;
export function identityToken(subject: string, nonce?: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'RS256', typ: 'JWT', kid: 'synthetic-browser-fixture' }),
    encode({
      iss: authority,
      aud: clientId,
      sub: subject,
      nonce,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    'synthetic-signature',
  ].join('.');
}
export async function fixtureIssuer(context: BrowserContext) {
  const state = {
    subject: 'auth-alice',
    cancel: false,
    refreshes: 0,
    authorizations: 0,
    exchanges: 0,
  };
  let nonce: string | undefined;
  let challenge = '';
  const cors = { 'Access-Control-Allow-Origin': '*' };
  await context.route(`${authority}/.well-known/openid-configuration`, (route) =>
    route.fulfill({
      headers: cors,
      json: {
        issuer: authority,
        authorization_endpoint: `${authority}/authorize`,
        token_endpoint: `${authority}/token`,
        userinfo_endpoint: `${authority}/userinfo`,
        jwks_uri: `${authority}/keys`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
      },
    }),
  );
  await context.route(`${authority}/authorize**`, async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('client_id')).toBe(clientId);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    challenge = url.searchParams.get('code_challenge')!;
    nonce = url.searchParams.get('nonce') ?? undefined;
    state.authorizations++;
    const redirect = new URL(url.searchParams.get('redirect_uri')!);
    expect(redirect.hostname).toBe('127.0.0.1');
    if (state.cancel) redirect.searchParams.set('error', 'access_denied');
    else redirect.searchParams.set('code', 'synthetic-authorization-code');
    redirect.searchParams.set('state', url.searchParams.get('state')!);
    // WebKit's intercepted responses do not support 302; an issuer page performs
    // the same top-level callback navigation while retaining real OIDC state.
    await route.fulfill({
      contentType: 'text/html',
      body: `<script>location.replace(${JSON.stringify(redirect.href)})</script>`,
    });
  });
  await context.route(`${authority}/token`, async (route) => {
    const form = new URLSearchParams(route.request().postData() ?? '');
    if (form.get('grant_type') === 'refresh_token') {
      state.refreshes++;
      expect(form.get('refresh_token')).toBe('synthetic-expired-refresh');
      await route.fulfill({
        status: 400,
        headers: cors,
        json: { error: 'invalid_grant', error_description: 'Synthetic refresh token expired' },
      });
      return;
    }
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('synthetic-authorization-code');
    expect(createHash('sha256').update(form.get('code_verifier')!).digest('base64url')).toBe(
      challenge,
    );
    state.exchanges++;
    await route.fulfill({
      headers: cors,
      json: {
        access_token: `synthetic-new-${state.subject}`,
        refresh_token: 'synthetic-new-refresh',
        id_token: identityToken(state.subject, nonce),
        token_type: 'Bearer',
        scope: 'openid email profile',
        expires_in: 3600,
      },
    });
  });
  return state;
}
