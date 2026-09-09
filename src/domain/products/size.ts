import { z } from 'zod';

export const measureSchema = z.enum(['oz', 'lb', 'g', 'kg', 'ml', 'l', 'fl oz', 'gal', 'count']);
export const sizeSchema = z.object({
  amount: z.number().positive().max(100000),
  measure: measureSchema,
  packs: z.number().int().min(1).max(1000),
});
export type PackageSize = z.infer<typeof sizeSchema>;
export function sizeLabel(size?: PackageSize): string {
  if (!size) return '';
  return `${size.packs > 1 ? `${size.packs} × ` : ''}${size.amount} ${size.measure}`;
}
// Compare declared sizes only. Rounding and weight/volume conversions can merge
// distinct products, so 15 oz and 425 g deliberately require a user correction.
export function parseSize(text: string): PackageSize | undefined {
  const match =
    /^(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|lbs?|g|kg|ml|l|gal|count|ct)$/i.exec(
      text.trim(),
    );
  if (!match?.[3]) return undefined;
  const measure = match[3].toLowerCase().replace(/\s+/g, ' ');
  const parsed = sizeSchema.safeParse({
    amount: Number(match[2]),
    measure: measure === 'lbs' ? 'lb' : measure === 'ct' ? 'count' : measure,
    packs: Number(match[1] ?? 1),
  });
  return parsed.success ? parsed.data : undefined;
}
