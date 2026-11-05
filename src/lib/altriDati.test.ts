import { describe, expect, it } from 'vitest'
import { righeFoglio, senzaToken } from './altriDati'

describe('altri dati', () => {
  it('toglie il token e lascia il resto', () => {
    expect(senzaToken({ token: 'x', email: 'a@b.it' })).toEqual({ email: 'a@b.it' })
  })

  it('il foglio ha l’unione delle colonne e scrive gli oggetti come testo', () => {
    const foglio = righeFoglio({ a: { nome: 'Ada', cane: { nome: 'Rex' } }, b: { nome: 'Bea', eta: 3 } })
    expect(foglio.colonne).toEqual(['cane', 'eta', 'nome'])
    expect(foglio.righe).toEqual([['{"nome":"Rex"}', '', 'Ada'], ['', 3, 'Bea']])
  })
})
