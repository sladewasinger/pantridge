import { useState } from 'react';
import type { RecognitionReview } from '../../domain/standardization/review';
import { ClarificationForm } from './ClarificationForm';

export function RecognitionReviews({ reviews }: { reviews: RecognitionReview[] }) {
  const [selected, select] = useState<RecognitionReview>();
  const [limit, setLimit] = useState(10);
  if (selected) return <ClarificationForm review={selected} onClose={() => select(undefined)} />;
  if (!reviews.length) return null;
  return (
    <section className="recognition-reviews" aria-label="Foods needing clarification">
      <h3>Needs your review · {reviews.length}</h3>
      {reviews.slice(0, limit).map((review) => (
        <button
          className="secondary full"
          key={review.key}
          onClick={() => select(review)}
          aria-label={`Clarify ${review.name} · ${review.context}`}
        >
          <span>
            {review.name}
            <small>{review.context}</small>
          </span>
        </button>
      ))}
      {reviews.length > limit && (
        <button className="text-button full" onClick={() => setLimit(limit + 10)}>
          Show more
        </button>
      )}
    </section>
  );
}
