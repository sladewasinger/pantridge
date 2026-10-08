import { randomBytes, timingSafeEqual } from 'node:crypto';
import { localAccounts, localOrigins, fullPorts } from './config';
import type { IncomingMessage } from 'node:http';
const tokens = new Map(localAccounts.map((owner) => [owner, randomBytes(32).toString('hex')]));
export function validLocalRequest(request: IncomingMessage): boolean {
  return (
    request.headers.host === `127.0.0.1:${fullPorts().api}` &&
    localOrigins().includes(request.headers.origin ?? '') &&
    request.headers['sec-fetch-site'] === 'same-origin'
  );
}
export function sessionFor(owner: string | null) {
  if (!localAccounts.includes(owner as (typeof localAccounts)[number])) return undefined;
  return { owner, token: tokens.get(owner as (typeof localAccounts)[number])! };
}
export function authenticatedOwner(request: IncomingMessage): string | undefined {
  const provided = Buffer.from(request.headers.authorization ?? '');
  for (const [owner, token] of tokens) {
    const expected = Buffer.from(`Bearer ${token}`);
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) return owner;
  }
  return undefined;
}
