import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { protectRequest, recordMalformed } from '../../../api/access/protection';
import { AccessError } from '../../../api/access/config';
const mocks = vi.hoisted(() => ({ admit: vi.fn(), count: vi.fn(), get: vi.fn(), send: vi.fn() }));
vi.mock('../../../api/access/admission', () => ({ admitAccount: mocks.admit }));
vi.mock('../../../api/access/store', () => ({
  countRequest: mocks.count,
  getRecord: mocks.get,
  accessDb: { send: mocks.send },
  accessTable: () => 'access',
  deadline: () => ({}),
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ identity: 'Google_person' });
  mocks.count.mockResolvedValue(1);
});
afterEach(() => vi.unstubAllEnvs());
it('allows a busy full-cart session well above the previous low limit', async () => {
  mocks.count.mockResolvedValueOnce(200);
  await expect(protectRequest('person', 'Google_person')).resolves.toBeUndefined();
  expect(mocks.admit).toHaveBeenCalledWith('person', 'Google_person');
  expect(mocks.send).not.toHaveBeenCalled();
});
it('cools down an isolated burst without suspending a normal account', async () => {
  mocks.count.mockResolvedValueOnce(241).mockResolvedValueOnce(1);
  await expect(protectRequest('person')).rejects.toMatchObject({ status: 429 });
  expect(mocks.send).not.toHaveBeenCalled();
});
it.each([
  [601, 1],
  [241, 3],
])('suspends sustained or extreme floods (%i requests)', async (requests, bursts) => {
  mocks.count.mockResolvedValueOnce(requests).mockResolvedValueOnce(bursts);
  await expect(protectRequest('person')).rejects.toMatchObject({ status: 403 });
  const transaction = mocks.send.mock.calls[0]![0] as { input: { TransactItems: unknown[] } };
  expect(JSON.stringify(transaction.input.TransactItems)).toContain('account#person');
  expect(JSON.stringify(transaction.input.TransactItems)).toContain('identity#Google_person');
  expect(JSON.stringify(transaction.input.TransactItems)).toContain('suspended');
});
it('tolerates an occasional malformed request but suspends repeated invalid traffic', async () => {
  mocks.count.mockResolvedValueOnce(1);
  await recordMalformed('person');
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.count.mockResolvedValueOnce(10);
  await expect(recordMalformed('person')).rejects.toThrow('suspended');
});
it('stops before quotas or downstream work for a suspended account', async () => {
  mocks.admit.mockRejectedValue(new AccessError(403, 'Suspended'));
  await expect(protectRequest('person')).rejects.toThrow('Suspended');
  expect(mocks.count).not.toHaveBeenCalled();
});
