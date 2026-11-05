import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

// Fissa il giorno in cui parte la riaccettazione, in un colpo solo: codice, pagine, archivio e copie.
const GIORNI_AVVISO = 15
const LOCALE = { it: 'it-IT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' }
const PAGINE = [
  'hosting/privacy/index.html',
  'hosting/termini/index.html',
  'hosting/dpa/index.html',
  'hosting/privacy/v2/index.html',
  'hosting/termini/v1-1/index.html',
  'hosting/dpa/v1/index.html',
]
const COPIE = [
  ['hosting/privacy/index.html', 'hosting/privacy.html'],
  ['hosting/privacy/index.html', 'docs/legal/privacy.html'],
  ['hosting/termini/index.html', 'docs/legal/termini.html'],
  ['hosting/dpa/index.html', 'docs/legal/dpa.html'],
]

const data = process.argv[2] ?? ''
if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T00:00:00Z`))) {
  console.error('Uso: npm run legale:data -- AAAA-MM-GG')
  process.exit(1)
}
const giorni = Math.floor((Date.parse(`${data}T00:00:00Z`) - Date.now()) / 86_400_000)
if (giorni < GIORNI_AVVISO) {
  console.error(`La data deve essere almeno ${GIORNI_AVVISO} giorni dopo oggi: i Termini promettono questo avviso.`)
  process.exit(1)
}

function scritta(lingua) {
  return new Intl.DateTimeFormat(LOCALE[lingua], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${data}T00:00:00Z`))
}

function aggiorna(html) {
  return html.split(/(?=<div data-lang=")/).map((pezzo) => {
    const lingua = /^<div data-lang="(\w+)"/.exec(pezzo)?.[1]
    if (!lingua) return pezzo
    return pezzo.replace(/<time class="in-vigore" datetime="[^"]*">[^<]*<\/time>/g, `<time class="in-vigore" datetime="${data}">${scritta(lingua)}</time>`)
  }).join('')
}

const codice = 'src/lib/versioneLegale.ts'
writeFileSync(codice, readFileSync(codice, 'utf8').replace(/RIACCETTA_DAL = '[^']*'/, `RIACCETTA_DAL = '${data}'`))
for (const pagina of PAGINE) writeFileSync(pagina, aggiorna(readFileSync(pagina, 'utf8')))
for (const [origine, copia] of COPIE) copyFileSync(origine, copia)
console.log(`Riaccettazione dal ${data}. Ora avvisa gli utenti almeno ${GIORNI_AVVISO} giorni prima.`)
