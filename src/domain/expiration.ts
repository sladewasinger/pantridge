import { dateLabel } from './selectors';
export function expirationBadge(date: string, today = new Date()) {
  const localDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((Date.parse(date) - localDay) / 86_400_000);
  if (days < 0) return { tone: 'past', label: `Past date · ${dateLabel(date)}` };
  if (days === 0) return { tone: 'soon', label: 'Today' };
  if (days === 1) return { tone: 'soon', label: 'Tomorrow' };
  return { tone: days <= 3 ? 'soon' : 'later', label: dateLabel(date) };
}
