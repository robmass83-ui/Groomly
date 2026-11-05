import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Dove un pacchetto offre una scelta si dichiara quella usata.
const SCELTE = { jszip: 'MIT', dompurify: 'Apache-2.0' }

function licenzaSuDisco(radice, percorso) {
  const file = join(radice, percorso, 'package.json')
  if (!existsSync(file)) return ''
  const dati = JSON.parse(readFileSync(file, 'utf8'))
  if (typeof dati.license === 'string') return dati.license
  if (Array.isArray(dati.licenses)) return dati.licenses.map((voce) => voce.type).join(' OR ')
  return ''
}

export function pacchettiDa(radice) {
  const lock = JSON.parse(readFileSync(join(radice, 'package-lock.json'), 'utf8'))
  return Object.entries(lock.packages ?? {}).flatMap(([percorso, voce]) => {
    if (percorso === '' || voce.dev === true || !percorso.includes('node_modules/')) return []
    const nome = percorso.slice(percorso.lastIndexOf('node_modules/') + 'node_modules/'.length)
    const licenza = SCELTE[nome] ?? voce.license ?? licenzaSuDisco(radice, percorso)
    return [{ nome, versione: voce.version ?? '', licenza: licenza || 'da verificare' }]
  })
}

export function elencoLicenze() {
  const unici = new Map()
  for (const voce of [...pacchettiDa('.'), ...pacchettiDa('functions')]) unici.set(`${voce.nome}@${voce.versione}`, voce)
  return [...unici.values()].sort((a, b) => a.nome.localeCompare(b.nome) || a.versione.localeCompare(b.versione))
}

if (process.argv[1]?.endsWith('genera-licenze.mjs')) {
  const elenco = elencoLicenze()
  writeFileSync('src/data/licenze.json', `${JSON.stringify(elenco, null, 1)}\n`)
  console.log(`${elenco.length} pacchetti`)
}
