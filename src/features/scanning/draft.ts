import type { Food, Snapshot } from '../../domain/model';
import type { Lookup } from '../../domain/products/lookup';
import type { StoragePage } from '../../app/navigation';
import { newFood } from '../../domain/selectors';
import { matchVariant, rememberedProduct } from '../../domain/products/variants';
import { sizeLabel } from '../../domain/products/size';

export function pendingScan(barcode: string): Lookup {
  return {
    product: { barcode, name: '', brand: '' },
    found: false,
    source: 'manual',
    classifiedBy: 'rules',
    packageText: '',
    suggestion: { name: 'Scanned item', unit: 'items', art: 'generic', location: 'pantry' },
  };
}

export function mergeScanDraft(
  current: Food,
  suggestion: Food,
  dirty: ReadonlySet<keyof Food>,
  refined: boolean,
): Food {
  const fields: (keyof Food)[] = ['name', 'unit', 'art', 'location', 'frozen'];
  if (!refined) fields.push('size', 'packageSize', 'brand', 'shelf');
  const merged = { ...current };
  for (const key of fields) {
    if (!dirty.has(key)) Object.assign(merged, { [key]: suggestion[key] });
  }
  return merged;
}

export function scanDraft(data: Snapshot, result: Lookup, location: StoragePage | null): Food {
  const candidate: Food = {
    ...newFood(),
    ...result.suggestion,
    name: result.found ? result.suggestion.name : '',
    size: result.size,
    packageSize: sizeLabel(result.size),
    location: result.suggestion.location === 'freezer' ? 'fridge' : result.suggestion.location,
    frozen: result.suggestion.location === 'freezer',
  };
  const known =
    rememberedProduct(data, result.product.barcode)?.food ?? matchVariant(data, candidate);
  const food = known ? { ...known, id: candidate.id } : candidate;
  const place = location ?? (food.frozen ? 'freezer' : food.location);
  return {
    ...food,
    brand: result.product.brand,
    location: place === 'freezer' ? 'fridge' : place,
    frozen: place === 'freezer',
  };
}
