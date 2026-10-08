import { expect, test } from '@playwright/test';
import { cookbookFixture } from './fixtures';
import { evidenceFingerprint, foodEvidence } from '../../../src/domain/standardization/evidence';

test.use({ serviceWorkers: 'block' });
test('Process now shows immediate eligibility and refreshes completed recognition without edits', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-08T04:31:00Z') });
  await page.addInitScript(() =>
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'recognition-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'recognition-status-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    ),
  );
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Brown Rice (microwaveable)';
  data.classificationJob = {
    state: 'queued',
    input: 'test',
    generation: 1,
    firstQueuedAt: Date.now(),
    dueAt: Date.now() + 600_000,
    attempts: 0,
  };
  let revision = 1;
  let requested = false;
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({ json: { revision, data } }),
  );
  await page.route('https://api.pantridge.test/v1/mutations', (route) => {
    expect(route.request().postDataJSON().command.type).toBe('classification.retry');
    requested = true;
    data.classificationJob!.dueAt = 0;
    revision++;
    return route.fulfill({ json: { revision, data } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText(/Food recognition ·/).click();
  await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
  await expect(page.getByRole('dialog')).toContainText('1 awaiting recognition');
  await page.getByRole('button', { name: 'Process now', exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await expect(page.getByRole('dialog')).toContainText('Queued for processing.');
  await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
  food.standardization = {
    version: '1',
    fingerprint: evidenceFingerprint(foodEvidence(food)),
    source: 'ai-private',
    status: 'recognized',
    identity: 'brown-rice',
    preparation: 'cooked',
    reason: '',
  };
  delete data.classificationJob;
  revision++;
  await page.clock.runFor(30_000);
  await expect(page.getByRole('dialog')).toContainText('No food recognition pending.');
  await expect(page.getByRole('button', { name: 'Process now', exact: true })).toHaveCount(0);
});
