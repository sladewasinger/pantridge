import { expect, test } from '@playwright/test';
import { client, foodFixture, localHeaders } from './client';

test('real API projects new identities for an old client and rejects an unsafe old write without erasing the correction', async ({
  request,
}) => {
  const alice = await client(request);
  const food = {
    ...foodFixture('Raspberries'),
    ingredient: { id: 'raspberries', preparation: 'raw' as const, basis: 'as-sold' as const },
  };
  await alice.mutate({ type: 'food.save', food });
  try {
    const session = await request.get('http://127.0.0.1:4178/v1/dev/session?account=dev-alice', {
      headers: localHeaders,
    });
    const { token } = await session.json();
    const headers = { ...localHeaders, Authorization: `Bearer ${token}` };
    const response = await request.get('http://127.0.0.1:4178/v1/kitchen', { headers });
    expect(response.ok()).toBe(true);
    const legacy = await response.json();
    const projected = legacy.data.foods.find((item: { id: string }) => item.id === food.id);
    expect(projected.ingredient).toBeUndefined();
    const before = await alice.read();
    const mutation = {
      id: crypto.randomUUID(),
      command: { type: 'food.save', food: { ...projected, location: 'fridge' } },
    };
    const rejected = await request.post('http://127.0.0.1:4178/v1/mutations', {
      headers,
      data: mutation,
    });
    expect(rejected.status()).toBe(426);
    expect(await rejected.json()).toMatchObject({
      message: expect.stringContaining('Update the app'),
    });
    const after = await alice.read();
    expect(after.revision).toBe(before.revision);
    expect(after.data.foods.find((item) => item.id === food.id)).toEqual(
      before.data.foods.find((item) => item.id === food.id),
    );
    // Updating the client must replay the same old mutation ID and body safely.
    const resumed = await request.post('http://127.0.0.1:4178/v1/mutations?catalogRevision=2', {
      headers,
      data: mutation,
    });
    expect(resumed.ok(), await resumed.text()).toBe(true);
    const updated = await resumed.json();
    expect(updated.data.foods.find((item: { id: string }) => item.id === food.id)).toMatchObject({
      location: 'fridge',
      ingredient: food.ingredient,
    });
    const duplicate = await request.post('http://127.0.0.1:4178/v1/mutations?catalogRevision=2', {
      headers,
      data: mutation,
    });
    expect((await duplicate.json()).revision).toBe(updated.revision);
  } finally {
    await alice.mutate({ type: 'food.remove', foodId: food.id });
  }
});
