import { leggiLinguaAttiva } from './linguaLocale'
import { t, type Chiave } from './t'

/** Per il codice fuori dalle schermate: la frase nella lingua che vede chi usa l'app. */
export function frase(chiave: Chiave, valori: Record<string, string | number> = {}): string {
  return t(leggiLinguaAttiva(), chiave, valori)
}
