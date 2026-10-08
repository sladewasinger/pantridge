import type { RecognitionReview } from '../../domain/standardization/review';

export function recognitionReason(review: RecognitionReview): string {
  switch (review.result?.status) {
    case 'composite':
      return 'This looks like a mixed food. Do not choose just one of its ingredients.';
    case 'taxonomy-gap':
      return 'This food is not in our ingredient list yet. You can keep its exact name.';
    case 'nonfood':
      return 'This may be a kitchen supply. You can change its item type in Move or edit item.';
    case 'unknown':
      return 'We could not identify this food.';
    case 'uncertain':
      return 'The available details do not establish one clear ingredient.';
    default:
      return 'The ingredient is known; its preparation needs clarification.';
  }
}
