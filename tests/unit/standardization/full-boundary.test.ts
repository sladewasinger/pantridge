import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { DynamoDBClient } from '../../../api/development-full/dynamodb';
import { fullConfiguration } from '../../../api/development-full/config';
import {
  validLocalRequest,
  authenticatedOwner,
  sessionFor,
} from '../../../api/development-full/session';
beforeEach(() => {
  vi.stubEnv('LOCAL_FULL_MODE', 'fixture');
  vi.stubEnv('TABLE_NAME', 'pantridge-local-fixture-kitchen');
  vi.stubEnv('ACCESS_TABLE', 'pantridge-local-fixture-access');
  vi.stubEnv('PRODUCT_TABLE', 'pantridge-local-fixture-products');
});
afterEach(() => vi.unstubAllEnvs());
it('cannot inherit cloud endpoints, credentials, or production table names', async () => {
  const client = new DynamoDBClient({
    endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
    credentials: { accessKeyId: 'untrusted', secretAccessKey: 'untrusted' },
  });
  expect((await client.config.endpoint!()).hostname).toBe('127.0.0.1');
  expect((await client.config.credentials()).accessKeyId).toBe('localdevelopment');
  client.destroy();
  vi.stubEnv('TABLE_NAME', 'pantridge-personal-kitchen');
  expect(() => new DynamoDBClient({})).toThrow('configuration rejected');
});
it('requires explicit full mode and distinct matching fixture/real table namespaces', () => {
  vi.stubEnv('LOCAL_FULL_MODE', 'real');
  expect(fullConfiguration).toThrow();
  vi.stubEnv('LOCAL_FULL_MODE', '');
  expect(fullConfiguration).toThrow();
});
it('requires exact host, same-origin browser context and an approved origin', () => {
  const request = new IncomingMessage(new Socket());
  request.headers = {
    host: '127.0.0.1:4176',
    origin: 'http://127.0.0.1:5176',
    'sec-fetch-site': 'same-origin',
  };
  expect(validLocalRequest(request)).toBe(true);
  request.headers.host = 'rebound.example:4176';
  expect(validLocalRequest(request)).toBe(false);
  request.headers.host = '127.0.0.1:4176';
  request.headers['sec-fetch-site'] = 'cross-site';
  expect(validLocalRequest(request)).toBe(false);
});
it('derives ownership only from opaque tokens for fixed test accounts', () => {
  const request = new IncomingMessage(new Socket());
  expect(sessionFor('production-owner')).toBeUndefined();
  request.headers.authorization = `Bearer ${sessionFor('dev-alice')!.token}`;
  expect(authenticatedOwner(request)).toBe('dev-alice');
  request.headers.authorization = 'Bearer dev-bob';
  expect(authenticatedOwner(request)).toBeUndefined();
});
