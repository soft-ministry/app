export function normalizeSearchText(value: unknown, ignoreDiacritics: boolean): string {
  const text = String(value ?? '').toLowerCase().trim();
  if (!ignoreDiacritics) {
    return text;
  }
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
