import { linguaDelTelefono, linguaValida, type Lingua } from './lingua'

const CHIAVE = 'groomly.lingua'

export function leggiLinguaSalvata(): Lingua | null {
  try {
    return linguaValida(localStorage.getItem(CHIAVE))
  } catch {
    return null
  }
}

export function leggiLinguaAttiva(telefono: string | null | undefined = typeof navigator === 'undefined' ? null : navigator.language): Lingua {
  return leggiLinguaSalvata() ?? linguaDelTelefono(telefono)
}

export function scriviLinguaLocale(lingua: Lingua): void {
  localStorage.setItem(CHIAVE, lingua)
}
