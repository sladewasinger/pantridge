import { z } from 'zod';
import registry from '../../src/domain/ingredient-matching/registry.json' with { type: 'json' };
import { resultSchema } from '../../src/domain/standardization/model';
import {
  classificationInstructions,
  classificationOutputSchema,
} from '../standardization/classify';
export type Format = 'full' | 'compact';
const compactSchema = (count: number) =>
  z.object({
    items: z
      .array(
        z.object({
          i: z
            .number()
            .int()
            .min(0)
            .max(count - 1),
          result: z.union([
            z.object({
              f: z
                .number()
                .int()
                .min(0)
                .max(registry.length - 1),
              p: resultSchema.shape.preparation.exclude(['any']),
              s: z.literal('recognized'),
            }),
            z.object({
              f: z.null(),
              p: resultSchema.shape.preparation.exclude(['any']),
              s: resultSchema.shape.status.exclude(['recognized']),
            }),
          ]),
        }),
      )
      .max(count),
  });
export function contract(format: Format, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 200)
    throw new Error('Experiment size out of bounds');
  const full = classificationOutputSchema(count);
  const compact = compactSchema(count);
  const schema = z.toJSONSchema(format === 'full' ? full : compact, { target: 'draft-7' });
  const instructions =
    classificationInstructions +
    (format === 'compact'
      ? '\nCompact encoding: i is input index, f is the registry numeric index (null if not recognized), p is preparation, s is status. Omit explanations only, never omit uncertainty. Numeric registry indices: ' +
        JSON.stringify(registry.map((item, index) => [index, item.id]))
      : '');
  return {
    schema,
    instructions,
    maxOutputTokens: Math.min(12000, 512 + count * (format === 'full' ? 60 : 30)),
    decode(output: unknown) {
      const rows =
        format === 'full'
          ? full.parse(output).items
          : compact.parse(output).items.map((row) => ({
              index: row.i,
              result: {
                identity: row.result.f === null ? null : registry[row.result.f]!.id,
                preparation: row.result.p,
                status: row.result.s,
                reason: '',
              },
            }));
      rows.sort((a, b) => a.index - b.index);
      if (
        rows.length !== count ||
        rows.some(
          (row, index) =>
            row.index !== index ||
            (row.result.status === 'recognized') !== (row.result.identity !== null),
        )
      )
        throw new Error('inconsistent-output');
      return rows.map((row) => resultSchema.parse(row.result));
    },
  };
}
