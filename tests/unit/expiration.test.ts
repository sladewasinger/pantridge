import { describe, expect, it } from 'vitest';
import { expirationBadge } from '../../src/domain/expiration';
import { dateLabel } from '../../src/domain/selectors';

describe('shelf expiration reminders', () => {
  const today = new Date(2026, 9, 6, 23, 30);
  it('hides distant dates, including next September, without treating them as past', () => {
    expect(expirationBadge('2027-09-27', today)).toBeNull();
    expect(expirationBadge('2026-10-14', today)).toBeNull();
    expect(expirationBadge('2026-10-13', today)).toMatchObject({ tone: 'later' });
  });
  it('retains today, tomorrow, near dates and past reminders', () => {
    expect(expirationBadge('2026-10-06', today)).toMatchObject({ label: 'Today' });
    expect(expirationBadge('2026-10-07', today)).toMatchObject({ label: 'Tomorrow' });
    expect(expirationBadge('2026-10-09', today)).toMatchObject({ tone: 'soon' });
    expect(expirationBadge('2026-10-05', today)).toMatchObject({ tone: 'past' });
  });
  it('shows the year across year boundaries and for old past dates', () => {
    expect(dateLabel('2027-09-27', today)).toContain('2027');
    expect(dateLabel('2026-09-27', today)).not.toContain('2026');
    expect(expirationBadge('2025-09-27', today)?.label).toContain('2025');
    const endOfYear = new Date(2026, 11, 29);
    expect(expirationBadge('2027-01-03', endOfYear)?.label).toContain('2027');
  });
});
