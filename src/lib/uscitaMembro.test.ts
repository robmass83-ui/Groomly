import { describe, expect, it } from 'vitest'
import { revocaMembroAllUscita } from './uscitaMembro'

describe('uscita di un membro', () => {
  it('un membro attivo esce come revocato', () => {
    expect(revocaMembroAllUscita({ uid: 'c1', status: 'attivo' })).toEqual({ uid: 'c1', status: 'revocato' })
  })

  it('un membro già revocato resta revocato', () => {
    expect(revocaMembroAllUscita({ uid: 'c1', status: 'revocato' })).toEqual({ uid: 'c1', status: 'revocato' })
  })
})
