import { linguaDelTelefono, linguaValida, type Lingua } from './lingua'
import { linguaDalLuogo } from './linguaLuogo'

const CHIAVE = 'groomly.lingua'

export function leggiLinguaSalvata(): Lingua | null {
  try {
    return linguaValida(localStorage.getItem(CHIAVE))
  } catch {
    return null
  }
}

export function leggiLinguaAttiva(
  telefono: string | null | undefined = typeof navigator === 'undefined' ? null : navigator.language,
  fuso: string | null | undefined = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Lingua {
  return leggiLinguaSalvata() ?? linguaDalLuogo(fuso) ?? linguaDelTelefono(telefono)
}

export function scriviLinguaLocale(lingua: Lingua): void {
  localStorage.setItem(CHIAVE, lingua)
}
