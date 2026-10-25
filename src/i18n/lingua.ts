export type Lingua = 'it' | 'en' | 'es'

export function linguaDelTelefono(tag: string | null | undefined): Lingua {
  const base = (tag ?? '').trim().toLowerCase().split('-')[0]
  if (base === 'it' || base === 'en' || base === 'es') return base
  return 'en'
}

export function linguaValida(value: unknown): Lingua | null {
  if (value === 'it' || value === 'en' || value === 'es') return value
  return null
}
