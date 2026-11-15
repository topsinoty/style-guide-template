export type Mode = { kind: 'private' } | { kind: 'public'; brand: string } | { kind: 'preview' };

export function readMode(search: string, hostedBrand?: string): Mode {
  if (hostedBrand) return { kind: 'public', brand: hostedBrand };
  const params = new URLSearchParams(search);
  const brand = params.get('brand');
  if (brand) return { kind: 'public', brand };
  return params.has('view') ? { kind: 'preview' } : { kind: 'private' };
}
