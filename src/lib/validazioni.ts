import { normalizeSearch } from './normalizza'

export const TELEFONO_CIFRE_MIN = 6
export const TELEFONO_CIFRE_MAX = 15
export const PESO_MAX_KG = 150
export const TITOLARE_MAX = 80
export const NOME_PERSONA_MAX = 40

/** Il titolare di un salone appena registrato: nome e cognome di chi lo apre. */
export function titolareDaRegistrazione(nome: string, cognome: string): string {
  return [nome.trim(), cognome.trim()].filter((parte) => parte !== '').join(' ').slice(0, TITOLARE_MAX)
}

/** Da 6 a 15 cifre; oltre alle cifre solo spazi, + - . / ( ). Il vuoto non è valido: decide chi la usa. */
export function telefonoValido(testo: string): boolean {
  const valore = testo.trim()
  if (!/^[\d\s+\-./()]+$/.test(valore)) return false
  const cifre = valore.replace(/\D/g, '').length
  return cifre >= TELEFONO_CIFRE_MIN && cifre <= TELEFONO_CIFRE_MAX
}

/** null se vuoto, NaN se non valido (solo cifre, un separatore decimale, da 0,1 a 150 kg). */
export function pesoDaTesto(testo: string): number | null {
  const grezzo = testo.trim()
  if (grezzo === '') return null
  if (!/^(\d+([.,]\d*)?|[.,]\d+)$/.test(grezzo) || /[.,]$/.test(grezzo)) return Number.NaN
  const valore = Number(grezzo.replace(',', '.'))
  return valore >= 0.1 && valore <= PESO_MAX_KG ? valore : Number.NaN
}

/** Il primo servizio con lo stesso nome normalizzato, escluso quello che si sta modificando. */
export function servizioDoppio(
  nome: string,
  servizi: readonly { id: string; name: string }[],
  escludiId?: string,
): { id: string; name: string } | null {
  const cercato = normalizeSearch(nome)
  return servizi.find((servizio) => servizio.id !== escludiId && normalizeSearch(servizio.name) === cercato) ?? null
}
