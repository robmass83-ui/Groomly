import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RIACCETTA_DAL } from '../src/lib/versioneLegale'

const LINGUE = ['it', 'en', 'es', 'fr', 'de'] as const

function blocco(html: string, lingua: string): string {
  const inizio = html.indexOf(`<div data-lang="${lingua}"`)
  const prossimo = html.indexOf('<div data-lang="', inizio + 1)
  return html.slice(inizio, prossimo === -1 ? undefined : prossimo)
}

const ARCHIVIO = [
  ['hosting/privacy/v2/index.html', '/privacy/'],
  ['hosting/termini/v1-1/index.html', '/termini/'],
  ['hosting/dpa/v1/index.html', '/dpa/'],
] as const

describe('archivio delle versioni in uso', () => {
  it.each(ARCHIVIO)('%s resta leggibile e fuori dai motori di ricerca', (file, nuova) => {
    const html = readFileSync(file, 'utf8')
    expect(html).toContain('<meta name="robots" content="noindex">')
    expect(html).not.toContain('robmass83')
    expect(html).not.toContain('firebaseapp.com')
    for (const lingua of LINGUE) {
      const testo = blocco(html, lingua)
      expect(testo, lingua).toContain('class="superata"')
      expect(testo, lingua).toContain(`href="${nuova}?lang=${lingua}"`)
      expect(testo, lingua).toContain('class="in-vigore"')
    }
  })
})

describe('privacy versione 3', () => {
  const html = readFileSync('hosting/privacy/index.html', 'utf8')

  it.each(LINGUE)('in %s ci sono titolare, fornitori e date', (lingua) => {
    const testo = blocco(html, lingua)
    for (const parola of ['Roberto Masala', 'Groomly Italia', 'Google Places', 'Hostinger', 'ImprovMX', 'GitHub', 'Analytics', 'Crashlytics', 'info@groomlyapp.it', 'Google Firebase (Authentication']) {
      expect(testo, parola).toContain(parola)
    }
    expect(testo).toContain(`href="/privacy/v2/?lang=${lingua}"`)
    expect(testo).toContain('class="in-vigore"')
    expect(testo).toMatch(/>\s*(Versione|Version|Versión) 3/)
    expect(testo).toContain('15')
  })

  it('non promette di fermare i crash subito', () => {
    expect(blocco(html, 'it')).toContain('i crash dal prossimo avvio')
    expect(blocco(html, 'it')).toContain('sugli altri quando riapri l’app')
  })
})

describe('termini 2 e DPA 2', () => {
  const termini = readFileSync('hosting/termini/index.html', 'utf8')
  const dpa = readFileSync('hosting/dpa/index.html', 'utf8')

  it.each(LINGUE)('i termini in %s hanno i piani nuovi e le clausole', (lingua) => {
    const testo = blocco(termini, lingua)
    expect(testo).not.toMatch(/<strong>(Base|Pro|Salone)<\/strong>/)
    expect(testo).not.toContain('Base')
    for (const parola of ['<strong>Go</strong>', '<strong>Plus</strong>', '<strong>Salon</strong>', 'Groomly Italia', 'class="in-vigore"', '12', '/dpa/?lang=', `/termini/v1-1/?lang=${lingua}`]) {
      expect(testo, parola).toContain(parola)
    }
    expect(testo).toMatch(/0.€|€0/)
  })

  it('i termini non promettono dati al sicuro', () => {
    expect(blocco(termini, 'it')).not.toContain('al sicuro')
    expect(blocco(termini, 'it')).toContain('così com’è')
    expect(blocco(termini, 'it')).toContain('listini e i collage')
  })

  it.each(LINGUE)('il DPA in %s ha i sub-responsabili e il rimando alla Privacy', (lingua) => {
    const testo = blocco(dpa, lingua)
    for (const parola of ['Google Drive', 'ImprovMX', 'Groomly Italia', `/privacy/?lang=${lingua}`, `/dpa/v1/?lang=${lingua}`, 'class="in-vigore"']) {
      expect(testo, parola).toContain(parola)
    }
  })
})

describe('data di partenza', () => {
  const PAGINE = [
    'hosting/privacy/index.html', 'hosting/termini/index.html', 'hosting/dpa/index.html',
    'hosting/privacy/v2/index.html', 'hosting/termini/v1-1/index.html', 'hosting/dpa/v1/index.html',
  ]
  const LOCALE = { it: 'it-IT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' } as const
  const scritta = (lingua: (typeof LINGUE)[number]) => new Intl.DateTimeFormat(LOCALE[lingua], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${RIACCETTA_DAL}T00:00:00Z`))

  it.each(PAGINE)('%s scrive la stessa data del codice', (file) => {
    const html = readFileSync(file, 'utf8')
    for (const lingua of LINGUE) {
      expect(blocco(html, lingua), lingua).toContain(`<time class="in-vigore" datetime="${RIACCETTA_DAL}">${scritta(lingua)}</time>`)
    }
  })
})
