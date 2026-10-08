import { expect, test } from '@playwright/test';
import { client, foodFixture, localHeaders } from './client';

test('local boundary rejects foreign origins, missing tokens, unknown accounts and oversized bodies', async ({
  request,
}) => {
  const base = 'http://127.0.0.1:4178/v1';
  expect(
    (
      await request.get(`${base}/dev/session?account=dev-alice`, {
        headers: { ...localHeaders, Origin: 'https://foreign.example' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`${base}/dev/session?account=production-user`, { headers: localHeaders })
    ).status(),
  ).toBe(403);
  expect((await request.get(`${base}/kitchen`, { headers: localHeaders })).status()).toBe(401);
  expect((await request.get(`${base}/dev/session?account=dev-alice`)).status()).toBe(403);
  const alice = await client(request);
  expect((await alice.post('mutations', { excessive: 'x'.repeat(17000) })).status()).toBe(413);
});

test('real transactions preserve idempotency, account isolation, queued work and cached reuse', async ({
  request,
}) => {
  const alice = await client(request);
  const bob = await client(request, 'dev-bob');
  await alice.post('dev/controls', { syncFailures: 0, providerFailures: 0, providerDelay: 0 });
  const food = foodFixture();
  const id = crypto.randomUUID();
  const secondId = crypto.randomUUID();
  try {
    const first = await alice.mutate({ type: 'food.save', food }, id);
    const repeated = await alice.mutate({ type: 'food.save', food }, id);
    expect(repeated.revision).toBe(first.revision);
    expect(first.data.classificationJob?.dueAt).toBeGreaterThan(Date.now() + 590000);
    expect((await bob.read()).data.foods.some((item) => item.id === food.id)).toBe(false);
    await alice.mutate({ type: 'classification.retry' });
    expect((await alice.read()).data.classificationJob?.dueAt).toBe(0);
    const before = (await (await alice.get('dev/status')).json()) as { calls: number };
    expect((await alice.post('dev/tick', {})).ok()).toBe(true);
    const recognized = (await alice.read()).data.foods.find((item) => item.id === food.id)!;
    expect(recognized.standardization).toMatchObject({
      identity: 'brown-rice',
      preparation: 'cooked',
    });
    expect(recognized.size).toBeUndefined();
    const after = (await (await alice.get('dev/status')).json()) as { calls: number };
    expect(after.calls).toBe(before.calls + 1);
    const { standardization: _saved, ...fresh } = recognized;
    const added = await alice.mutate({ type: 'food.save', food: { ...fresh, id: secondId } });
    expect(added.data.foods.find((item) => item.id === secondId)?.standardization).toBeUndefined();
    expect(added.data.classificationJob).toBeDefined();
    await alice.mutate({ type: 'classification.retry' });
    await alice.post('dev/tick', {});
    expect(
      (await alice.read()).data.foods.find((item) => item.id === secondId)?.standardization
        ?.identity,
    ).toBe('brown-rice');
    expect(((await (await alice.get('dev/status')).json()) as { calls: number }).calls).toBe(
      after.calls,
    );
  } finally {
    await alice.mutate({ type: 'food.remove', foodId: secondId });
    await alice.mutate({ type: 'food.remove', foodId: food.id });
  }
});

test('late provider results preserve a manual correction made during real database work', async ({
  request,
}) => {
  const alice = await client(request);
  const food = foodFixture('Delayed local grocery');
  try {
    await alice.post('dev/controls', { providerDelay: 3000, providerFailures: 0 });
    await alice.mutate({ type: 'food.save', food });
    await alice.mutate({ type: 'classification.retry' });
    const work = alice.post('dev/tick', {});
    await expect
      .poll(async () => (await alice.read()).data.classificationJob?.state)
      .toBe('processing');
    const ingredient = { id: 'brown-rice', preparation: 'dry' as const, basis: 'as-sold' as const };
    await alice.mutate({ type: 'food.save', food: { ...food, ingredient } });
    await work;
    const saved = (await alice.read()).data.foods.find((item) => item.id === food.id)!;
    expect(saved.ingredient).toEqual(ingredient);
    expect(saved.standardization).toBeUndefined();
  } finally {
    await alice.post('dev/controls', { providerDelay: 0 });
    await alice.mutate({ type: 'food.remove', foodId: food.id });
  }
});

test('provider failures persist retry state and ordinary sync failure does not lose the kitchen', async ({
  request,
}) => {
  const alice = await client(request);
  const food = foodFixture('Failing local grocery');
  try {
    await alice.mutate({ type: 'food.save', food });
    await alice.post('dev/controls', { providerFailures: 1 });
    await alice.mutate({ type: 'classification.retry' });
    await alice.post('dev/tick', {});
    expect((await alice.read()).data.classificationJob).toMatchObject({
      state: 'retry',
      attempts: 1,
    });
    await alice.post('dev/controls', { syncFailures: 1 });
    expect((await alice.get('kitchen')).status()).toBe(503);
    expect((await alice.read()).data.foods.some((item) => item.id === food.id)).toBe(true);
  } finally {
    await alice.mutate({ type: 'food.remove', foodId: food.id });
  }
});
