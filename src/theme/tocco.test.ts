import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('classe tocco', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/theme/tocco.css'), 'utf8')

  it('la regola allarga la zona toccabile ad almeno 40 px', () => {
    expect(css).toMatch(/\.tocco::after\s*\{[^}]*width:\s*max\(100%,\s*40px\)[^}]*height:\s*max\(100%,\s*40px\)/)
  })

  it('è importata dal CSS globale', () => {
    const indice = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(indice).toContain('./theme/tocco.css')
  })
})
