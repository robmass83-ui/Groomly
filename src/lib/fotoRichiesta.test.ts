import { describe, expect, it } from 'vitest'
import { fotoRichiesta, razzaRichiesta } from './fotoRichiesta'

const jpeg = `data:image/jpeg;base64,${'A'.repeat(80)}`

describe('razza e foto della richiesta', () => {
  it('la razza è obbligatoria e resta corta', () => {
    expect(razzaRichiesta('  Labrador  retriever ')).toBe('Labrador retriever')
    expect(razzaRichiesta('meticcio')).toBe('meticcio')
    expect(razzaRichiesta(' A ')).toBeNull()
    expect(razzaRichiesta('')).toBeNull()
    expect(razzaRichiesta('x'.repeat(81))).toBeNull()
  })

  it('accetta fino a tre immagini leggere e rifiuta il resto', () => {
    expect(fotoRichiesta(undefined)).toEqual([])
    expect(fotoRichiesta([jpeg, jpeg.replace('jpeg', 'png'), jpeg.replace('jpeg', 'webp')])).toHaveLength(3)
    expect(fotoRichiesta([jpeg, jpeg, jpeg, jpeg])).toBeNull()
    expect(fotoRichiesta(['javascript:alert(1)'])).toBeNull()
    expect(fotoRichiesta(['data:image/svg+xml;base64,' + 'A'.repeat(80)])).toBeNull()
    expect(fotoRichiesta([jpeg + 'non-base64'])).toBeNull()
    expect(fotoRichiesta(['data:image/jpeg;base64,' + 'A'.repeat(200_000)])).toBeNull()
  })
})