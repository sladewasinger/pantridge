import { dispatch, getAccount, useKitchen } from '../../data/store';
import { classificationTargets } from '../../domain/standardization/targets';
import { localTesting } from '../../local-testing';
import { useAction } from '../../ui/useAction';
import { batchSize } from '../../domain/standardization/model';
import { classificationStatusCopy } from './status-copy';
import { useSyncStatus } from '../../data/useSyncStatus';
import type { ClassificationJob } from '../../domain/standardization/job';

function processBlocked(job: ClassificationJob | undefined, pending: number, offline: boolean) {
  return !localTesting && (pending > 0 || job?.state === 'processing' || offline);
}

export function ClassificationStatus() {
  const { data, pending } = useKitchen();
  const targets = classificationTargets(data);
  const sync = useSyncStatus();
  const job = data.classificationJob;
  const { run, error, busy } = useAction();
  const local = getAccount() === 'local' && !localTesting;
  return (
    <section className="settings-section">
      <details>
        <summary>
          Food recognition{targets.length > 0 ? ` · ${targets.length} awaiting recognition` : ''}
        </summary>
        <p className="muted">
          Known foods match recipes on this device. Unfamiliar names use AI after syncing.
        </p>
        {local ? (
          <p>Sign in to recognize unfamiliar foods. Manual recipe matching works offline.</p>
        ) : (
          <>
            <p role="status">
              {classificationStatusCopy(job, pending.length, targets.length, {
                localTesting,
              })}
            </p>
            {sync.status === 'offline' && (
              <p className="muted">
                Offline. Synced jobs continue; reconnect to see their results.
              </p>
            )}
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
                disabled={busy || processBlocked(job, pending.length, sync.status === 'offline')}
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
