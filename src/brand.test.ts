import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

const names = [
  'groomly-icon.svg',
  'groomly-icon-fullbleed.svg',
  'groomly-logo-verticale.svg',
  'groomly-logo-scuro.svg',
  'groomly-logo-orizzontale.svg',
]

describe('marchio', () => {
  it('copia i cinque file senza cambiarli', () => {
    for (const name of names) {
      const original = readFileSync(path.join(root, 'Icon and logo', name))
      const copy = readFileSync(path.join(root, 'src', 'assets', 'brand', name))
      expect(Buffer.compare(original, copy)).toBe(0)
    }
    const icon = readFileSync(path.join(root, 'Icon and logo', 'groomly-icon.svg'))
    const published = readFileSync(path.join(root, 'public', 'groomly-icon.svg'))
    expect(Buffer.compare(icon, published)).toBe(0)
  })

  it('punta la scheda del browser all’icona rotonda', () => {
    const html = readFileSync(path.join(root, 'index.html'), 'utf8')
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/groomly-icon.svg" />')
  })

  it('il logo di testata è l’orizzontale senza TOELETTATURA', () => {
    const pairs: [string, string, string][] = [
      ['groomly-logo-orizzontale.svg', 'groomly-logo-testata.svg', '#6B7A8C'],
      ['groomly-logo-scuro.svg', 'groomly-logo-testata-scuro.svg', '#B8C4D2'],
    ]
    for (const [source, target, subtitle] of pairs) {
      const original = readFileSync(path.join(root, 'Icon and logo', source), 'utf8')
      const testata = readFileSync(path.join(root, 'src', 'assets', 'brand', target), 'utf8')
      const expected = original
        .replace(new RegExp(`<g fill="${subtitle}">[\\s\\S]*?</g>\\s*`), '')
        .replace('viewBox="0 0 437 120" width="1311" height="360"', 'viewBox="6 6 426 108"')
      expect(testata).toBe(expected)
      expect(testata).not.toContain(`fill="${subtitle}"`)
    }
  })
})
