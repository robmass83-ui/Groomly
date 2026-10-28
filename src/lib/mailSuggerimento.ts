export const SUGGERIMENTI_AL_GIORNO = 5

export function emailAuthSuggerimento(email: string | null | undefined): string {
  const valore = (email ?? '').trim()
  if (valore.length === 0 || valore.length > 320 || /[\r\n]/.test(valore)) return ''
  return valore
}

export function decisioneMailSuggerimento(input: {
  giorno: string
  giornoSalvato: string
  conteggio: number
}): { invia: boolean; prossimo: number; giorno: string } {
  const base = input.giornoSalvato === input.giorno && Number.isFinite(input.conteggio) && input.conteggio > 0
    ? Math.floor(input.conteggio)
    : 0
  const prossimo = base + 1
  return { invia: prossimo <= SUGGERIMENTI_AL_GIORNO, prossimo, giorno: input.giorno }
}
