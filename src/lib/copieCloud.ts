import { haAccesso, type StatoPiano } from './piano'

const GIORNO_MS = 24 * 60 * 60 * 1000

export function nomeCopia(giorno: Date): string {
  const mese = String(giorno.getMonth() + 1).padStart(2, '0')
  const data = String(giorno.getDate()).padStart(2, '0')
  return `${giorno.getFullYear()}-${mese}-${data}`
}

export function fotoNuove(foto: readonly string[], giaCopiate: ReadonlySet<string>): string[] {
  const viste = new Set<string>()
  return foto.filter((id) => {
    if (giaCopiate.has(id) || viste.has(id)) return false
    viste.add(id)
    return true
  })
}

export function copieScadute(giorni: readonly string[], adesso: Date, tenutaGiorni = 30): string[] {
  return giorni.filter((giorno) => {
    const data = new Date(`${giorno}T00:00:00.000Z`)
    return !Number.isNaN(data.getTime()) && adesso.getTime() - data.getTime() > tenutaGiorni * GIORNO_MS
  })
}

export function copieDisponibili(stato: StatoPiano, bucket: string | null): 'paywall' | 'assenti' | 'elenco' {
  if (!haAccesso(stato, 'copieCloud')) return 'paywall'
  if (!bucket) return 'assenti'
  return 'elenco'
}
