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
})
