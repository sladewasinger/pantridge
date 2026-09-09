import { z } from 'zod';

export function validBarcode(code: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  if (/^0+$/.test(code)) return false;
  const digits = [...code].map(Number).reverse();
  const sum = digits.reduce((total, digit, index) => total + digit * (index % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}
export const barcodeSchema = z.string().refine(validBarcode, 'Enter a valid EAN or UPC barcode.');
export function normalizeBarcode(code: string): string {
  // UPC-A and EAN-13 with a leading zero identify the same package.
  return barcodeSchema.parse(code.trim()).padStart(14, '0');
}
export const productSchema = z.object({
  barcode: barcodeSchema,
  name: z.string().trim().max(160),
  brand: z.string().trim().max(80),
  source: z.literal('openfoodfacts').optional(),
});
export type Product = z.infer<typeof productSchema>;
