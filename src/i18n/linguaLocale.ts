import { linguaDelTelefono, linguaValida, type Lingua } from './lingua'
import { linguaVecchiaRegola } from './linguaLuogo'

const CHIAVE = 'groomly.lingua'
const PASSAGGIO = 'groomly.linguaPassaggio'
const SEGNI_INSTALLAZIONE = ['groomly.session', 'groomly.auth', 'groomly.lastSignIn']
const PREFISSI_INSTALLAZIONE = ['groomly.users.', 'groomly.mirror.']

function telefonoAttuale(): string | null {
  return typeof navigator === 'undefined' ? null : navigator.language
}

export function leggiLinguaSalvata(): Lingua | null {
  try {
    return linguaValida(localStorage.getItem(CHIAVE))
  } catch {
    return null
  }
}

export function leggiLinguaAttiva(telefono: string | null | undefined = telefonoAttuale()): Lingua {
  return leggiLinguaSalvata() ?? linguaDelTelefono(telefono)
}

export function scriviLinguaLocale(lingua: Lingua): void {
  localStorage.setItem(CHIAVE, lingua)
}

function appGiaUsata(): boolean {
  if (SEGNI_INSTALLAZIONE.some((chiave) => localStorage.getItem(chiave) !== null)) return true
  for (let i = 0; i < localStorage.length; i += 1) {
    const chiave = localStorage.key(i)
    if (chiave && PREFISSI_INSTALLAZIONE.some((prefisso) => chiave.startsWith(prefisso))) return true
  }
  return false
}

/**
 * Una volta sola: chi aveva già l'app senza aver mai scelto tiene la lingua che vedeva.
 * Il segno si scrive anche sulle installazioni nuove, che al prossimo avvio sembrerebbero vecchie.
 */
export function passaggioLingua(
  telefono: string | null | undefined = telefonoAttuale(),
  fuso: string | null | undefined = Intl.DateTimeFormat().resolvedOptions().timeZone,
): void {
  try {
    if (localStorage.getItem(PASSAGGIO) !== null) return
    if (leggiLinguaSalvata() === null && appGiaUsata()) scriviLinguaLocale(linguaVecchiaRegola(telefono, fuso))
    localStorage.setItem(PASSAGGIO, '1')
  } catch {
    return
  }
}
