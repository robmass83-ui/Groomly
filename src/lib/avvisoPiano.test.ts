import { describe, expect, it } from 'vitest'
import { oggettoAvviso } from './avvisoPiano'

describe('avviso piano', () => {
  it('l’oggetto segue la lingua', () => {
    expect(oggettoAvviso('it')).toBe('Il piano Groomly è stato aggiornato')
    expect(oggettoAvviso('en')).toBe('Your Groomly plan was updated')
    expect(oggettoAvviso('es')).toBe('Tu plan de Groomly se ha actualizado')
  })
})
