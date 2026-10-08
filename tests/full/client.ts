import { expect, type APIRequestContext } from '@playwright/test';
import type { Envelope, Food } from '../../src/domain/model';
import type { Command } from '../../src/domain/commands';
export const localHeaders = { Origin: 'http://127.0.0.1:5178', 'Sec-Fetch-Site': 'same-origin' };
export async function client(request: APIRequestContext, owner = 'dev-alice') {
  const session = await request.get(`http://127.0.0.1:4178/v1/dev/session?account=${owner}`, {
    headers: localHeaders,
  });
  expect(session.ok()).toBe(true);
  const { token } = (await session.json()) as { token: string };
  const headers = { ...localHeaders, Authorization: `Bearer ${token}` };
  const get = (path: string) => request.get(`http://127.0.0.1:4178/v1/${path}`, { headers });
  const post = (path: string, data: unknown) =>
    request.post(`http://127.0.0.1:4178/v1/${path}`, { headers, data });
  const status = await get('dev/status');
  expect(await status.json(), 'Full tests require their isolated fixture namespace.').toMatchObject(
    { mode: 'fixture', namespace: 'fixture-test' },
  );
  return {
    get,
    post,
    read: async () => {
      const response = await get('kitchen');
      expect(response.ok()).toBe(true);
      return (await response.json()) as Envelope;
    },
    mutate: async (command: Command, id = crypto.randomUUID()) => {
      const response = await post('mutations', { id, command });
      expect(response.ok(), await response.text()).toBe(true);
      return (await response.json()) as Envelope;
    },
  };
}
export const foodFixture = (name = 'Brown Rice (microwaveable)'): Food => ({
  id: crypto.randomUUID(),
  name,
  unit: 'bags',
  art: 'rice',
  kind: 'food',
  brand: `Integration test ${crypto.randomUUID()}`,
  packageSize: '',
  location: 'pantry',
  shelf: 0,
  frozen: false,
});
