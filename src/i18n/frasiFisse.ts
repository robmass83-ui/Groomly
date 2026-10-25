import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { en } from './en'
import { it } from './it'

export const PAROLE_ITALIANE = [
  'Impostazioni', 'Appuntamento', 'Appuntamenti', 'Salvataggio', 'Animale', 'Animali',
  'Agenda', 'Mensili', 'Listino', 'Chiudi', 'Annulla', 'Elimina', 'Archivio', 'Servizi',
  'Notifiche', 'Backup', 'Titolare', 'Collaboratore', 'Nessun', 'Nessuna', 'Aggiungi',
  'Incassi', 'Razza', 'Taglia', 'Chiuso', 'Settimana', 'Domani', 'Conferma', 'Indietro',
]

const DIVERSE = new Set(
  (Object.keys(it) as (keyof typeof it)[]).filter((chiave) => it[chiave] !== en[chiave]).map((chiave) => it[chiave]),
)

const PAROLA = new RegExp(`\\b(${PAROLE_ITALIANE.join('|')})\\b`)

export function letteraliVisibili(source: string): string[] {
  const pulito = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1')
  const trovati: string[] = []
  const re = /(['"])((?:\\.|(?!\1)[^\\])*)\1/g
  let match: RegExpExecArray | null
  while ((match = re.exec(pulito))) {
    const testo = match[2].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"')
    if (testo.length < 4) continue
    if (testo.includes('/') || testo.includes('var(--') || testo.includes('#')) continue
    const italiana = DIVERSE.has(testo) || /[àèéìòùÀÈÉÌÒÙ]/.test(testo) || PAROLA.test(testo)
    if (italiana) trovati.push(testo)
  }
  return trovati
}

export function fileTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) fileTsx(path, out)
    else if (name.endsWith('.tsx') && !name.includes('.test.') && name !== 'DevKitPage.tsx') out.push(path)
  }
  return out
}

export function importaItalianoFisso(source: string): boolean {
  return /from ['"](?:\.\.\/)+i18n\/it['"]/.test(source)
}

export function frasiNelFile(path: string): string[] {
  const source = readFileSync(path, 'utf8')
  const importo = importaItalianoFisso(source) ? ['importa il catalogo italiano'] : []
  return [...importo, ...letteraliVisibili(source)]
}
