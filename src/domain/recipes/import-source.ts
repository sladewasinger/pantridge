export function sourceUrl(value: unknown): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 500)
    throw new Error('Use a short HTTPS source link.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Source links must use HTTPS and contain no sign-in information.');
  return url.href;
}
export function findRecipe(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 5 || value === null || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('This import contains too many entries.');
    return value.map((entry) => findRecipe(entry, depth + 1)).find(Boolean);
  }
  const item = value as Record<string, unknown>;
  const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
  if (types.includes('Recipe') || types.includes('https://schema.org/Recipe')) return item;
  if (item['@graph']) return findRecipe(item['@graph'], depth + 1);
  return undefined;
}
export function instructionLines(value: unknown, depth = 0): string[] {
  if (depth > 5) throw new Error('Recipe instructions are nested too deeply.');
  if (typeof value === 'string')
    return value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  if (Array.isArray(value)) {
    if (value.length > 50) throw new Error('Use at most 50 instruction steps.');
    return value.flatMap((entry) => instructionLines(entry, depth + 1));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return instructionLines(record.text ?? record.itemListElement, depth + 1);
  }
  return [];
}
