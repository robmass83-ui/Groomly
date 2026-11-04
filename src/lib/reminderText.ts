import { frase } from '../i18n/frase'

export function reminderText(rows: { dog: { name: string } }[]): string | null {
  if (rows.length === 0) return null
  const label = rows.length === 1 ? frase('mensiliUno') : frase('mensiliAltri', { n: rows.length })
  const names = rows.slice(0, 3).map((row) => row.dog.name).join(', ')
  return `${label}: ${names}`
}
