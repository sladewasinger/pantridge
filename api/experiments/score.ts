import type { StandardizationResult } from '../../src/domain/standardization/model';
import type { Fixture } from './fixtures';
export function score(fixtures: Fixture[], results?: StandardizationResult[]) {
  if (!results) return { unscored: fixtures.length };
  let identityCorrect = 0,
    preparationCorrect = 0,
    preparationScored = 0,
    falseRecognition = 0,
    hardCorrect = 0,
    hardCount = 0;
  const errors: unknown[] = [];
  fixtures.forEach((fixture, index) => {
    const actual = results[index]!;
    const identity =
      fixture.expected.ids.includes(actual.identity) &&
      fixture.expected.statuses.includes(actual.status);
    const preparation =
      !fixture.expected.preparation || fixture.expected.preparation === actual.preparation;
    if (identity) identityCorrect++;
    if (fixture.expected.preparation) {
      preparationScored++;
      if (preparation) preparationCorrect++;
    }
    if (actual.status === 'recognized' && !fixture.expected.ids.includes(actual.identity))
      falseRecognition++;
    if (fixture.hard) {
      hardCount++;
      if (identity && preparation) hardCorrect++;
    }
    if (!identity || !preparation)
      errors.push({
        name: fixture.evidence.name,
        details: fixture.evidence.details,
        expected: fixture.expected,
        actual,
      });
  });
  return {
    identityCorrect,
    preparationCorrect,
    preparationScored,
    falseRecognition,
    hardCorrect,
    hardCount,
    errors,
  };
}
