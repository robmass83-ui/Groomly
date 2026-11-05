import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

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
