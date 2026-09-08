export async function revokeRefreshToken(
  domain: string,
  clientId: string,
  token: string,
): Promise<void> {
  try {
    await fetch(new URL('/oauth2/revoke', domain), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, token }),
      signal: AbortSignal.timeout(3000),
      credentials: 'omit',
    });
  } catch {
    // Local sign-out must still work offline; revocation requires a connection.
  }
}
