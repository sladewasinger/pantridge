import type { ClassificationJob } from '../../domain/standardization/job';

export function classificationStatusCopy(
  job: ClassificationJob | undefined,
  pending: number,
  count: number,
  { localTesting = false, now = Date.now() }: { localTesting?: boolean; now?: number } = {},
): string {
  if (!count) return 'No food recognition pending.';
  if (pending && !localTesting) return 'Waiting for these edits to sync.';
  if (!job)
    return localTesting
      ? 'Isolated test kitchen. Process one batch below.'
      : 'Waiting for server scheduling.';
  if (job.state === 'processing') return 'Recognizing foods. You can close the app.';
  if (job.state === 'failed')
    return 'Recognition could not finish. Retry or use Recipe matching to correct an item.';
  if (job.state === 'paused') return 'Cloud recognition is paused.';
  if (job.dueAt <= now) return 'Queued for processing. You can close the app.';
  const due = new Date(job.dueAt);
  const time = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const when =
    due.toDateString() === new Date(now).toDateString()
      ? time
      : `${due.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
  return `${job.state === 'retry' ? 'Retry scheduled' : 'Queued'} for ${when}. Continues with the app closed.`;
}
