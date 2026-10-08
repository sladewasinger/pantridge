import { dispatch, getAccount, useKitchen } from '../../data/store';
import { classificationTargets } from '../../domain/standardization/targets';
import { localTesting } from '../../local-testing';
import { useAction } from '../../ui/useAction';
import { batchSize } from '../../domain/standardization/model';

export function ClassificationStatus() {
  const { data, pending } = useKitchen();
  const targets = classificationTargets(data);
  const job = data.classificationJob;
  const { run, error, busy } = useAction();
  const local = getAccount() === 'local' && !localTesting;
  return (
    <section className="settings-section">
      <details>
        <summary>
          Food recognition{targets.length > 0 ? ` · ${targets.length} pending` : ''}
        </summary>
        <p className="muted">
          Known foods match recipes on this device. Unfamiliar names use AI after syncing; amounts
          and safety still need review.
        </p>
        {local ? (
          <p>Sign in to recognize unfamiliar foods. Manual recipe matching works offline.</p>
        ) : (
          <>
            <p role="status">{statusCopy(job, pending.length, targets.length)}</p>
            {targets.length > 0 && (
              <ul>
                {targets.slice(0, 10).map((target) => (
                  <li key={target.key}>{target.evidence.name}</li>
                ))}
              </ul>
            )}
            {targets.length > 10 && <p>And {targets.length - 10} more.</p>}
            {(job || localTesting) && targets.length > 0 && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (localTesting) await (await import('./local-client')).classifyLocalBatch();
                    else await dispatch({ type: 'classification.retry' });
                  })
                }
              >
                {localTesting ? `Classify up to ${batchSize} (local test)` : 'Process now'}
              </button>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </details>
    </section>
  );
}
function statusCopy(
  job: ReturnType<typeof useKitchen>['data']['classificationJob'],
  pending: number,
  count: number,
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
  return `${job.state === 'retry' ? 'Retry scheduled' : 'Queued'} for ${new Date(job.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Continues with the app closed.`;
}
