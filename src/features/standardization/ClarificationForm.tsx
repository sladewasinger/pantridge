import { useState } from 'react';
import { dispatch, getAccount } from '../../data/store';
import type { RecognitionReview } from '../../domain/standardization/review';
import { useAction } from '../../ui/useAction';
import { recognitionReason } from './review-copy';
import { ClarificationFields, initialClarification, canClarify } from './ClarificationFields';

export function ClarificationForm({
  review,
  onClose,
}: {
  review: RecognitionReview;
  onClose: () => void;
}) {
  const [account] = useState(getAccount);
  const [identity, setIdentity] = useState(() => initialClarification(review));
  const { run, busy, error } = useAction();
  const exact = identity?.id.startsWith('custom-');
  return (
    <form
      aria-label={`Clarify ${review.name}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!identity || !canClarify(identity)) return;
        void run(async () => {
          if (account !== getAccount())
            throw new Error('Your kitchen changed. Reopen this review.');
          await dispatch({
            type: 'classification.review',
            key: review.key,
            expected: review.signature,
            ingredient: identity,
          });
          onClose();
        });
      }}
    >
      <h3>{review.name}</h3>
      <p className="muted">
        {review.context} · {recognitionReason(review)}
      </p>
      <ClarificationFields
        review={review}
        identity={identity}
        disabled={busy}
        onChange={setIdentity}
      />
      <p className="muted">
        {exact
          ? 'Exact name only. Recipe compatibility and amounts still need review.'
          : 'Not sure? Leave this for later. Package amounts and dietary safety are separate.'}
      </p>
      <button className="secondary full" disabled={busy || !canClarify(identity)}>
        Save clarification
      </button>
      <button type="button" className="text-button full" disabled={busy} onClick={onClose}>
        Back to recognition
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
