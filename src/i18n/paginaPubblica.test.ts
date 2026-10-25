import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { linguaPagina } from './paginaPubblica'

describe('lingua delle pagine pubbliche', () => {
  it('?lang= sceglie la lingua e un valore sconosciuto ricade sul browser', () => {
    expect(linguaPagina('en', 'it-IT')).toBe('en')
    expect(linguaPagina('es', 'en-GB')).toBe('es')
    expect(linguaPagina('it', 'en')).toBe('it')
    expect(linguaPagina('fr', 'it-IT')).toBe('it')
    expect(linguaPagina('fr', 'de-DE')).toBe('en')
    expect(linguaPagina(null, 'es-ES')).toBe('es')
    expect(linguaPagina('', 'fr')).toBe('en')
  })

  it('ogni pagina pubblica ha la riga delle tre lingue', () => {
    const utili = htmlIn('hosting').filter((file) => !file.includes('_frammenti'))
    expect(utili.length).toBeGreaterThan(8)
    for (const file of utili) {
      const html = readFileSync(file, 'utf8')
      expect(html, file).toContain('Italiano')
      expect(html, file).toContain('English')
      expect(html, file).toContain('Español')
      expect(html, file).toContain('data-lang="en"')
      expect(html, file).toContain('data-lang="es"')
      expect(html, file).toContain('lingua-pagina.js')
    }
  })
})

function htmlIn(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) htmlIn(full, acc)
    else if (name.endsWith('.html')) acc.push(full)
  }
  return acc
}
