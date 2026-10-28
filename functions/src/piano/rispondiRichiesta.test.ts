import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('rispondiRichiesta', () => {
  it('la GET torna prima di applicare il piano', () => {
    const src = readFileSync('functions/src/piano/rispondiRichiesta.ts', 'utf8')
    const get = src.indexOf("if (req.method === 'GET')")
    const applica = src.indexOf('applicaPiano(')
    expect(get).toBeGreaterThan(-1)
    expect(applica).toBeGreaterThan(get)
    expect(src.slice(get, applica)).toContain('return')
    expect(src).toContain('htmlDomandaRisposta')
    expect(src).toContain("req.method !== 'GET' && req.method !== 'POST'")
    expect(src).not.toContain('console.')
  })
})
