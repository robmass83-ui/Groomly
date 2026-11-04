import { describe, expect, it } from 'vitest'
import { ENTITLEMENT, OFFERING_ID, OFFERTA_EARLY_ADOPTER, PIANI_BASE, PRODOTTI_PLAY, idProdottoRevenueCat } from './idAbbonamenti'

describe('ID fissi degli abbonamenti', () => {
  it('sono quelli scritti in PRIMA-DEI-PAGAMENTI.md', () => {
    expect(PRODOTTI_PLAY).toEqual({ plus: 'groomly_plus', salone: 'groomly_salone', postoExtra: 'groomly_posto_extra' })
    expect(PIANI_BASE).toEqual({ mensile: 'mensile', annuale: 'annuale' })
    expect(OFFERTA_EARLY_ADOPTER).toBe('early-adopter')
    expect(ENTITLEMENT).toEqual({ pro: 'plus', salone: 'salone' })
    expect(OFFERING_ID).toBe('groomly_standard')
  })

  it('compone l’ID di RevenueCat per Play', () => {
    expect(idProdottoRevenueCat('groomly_plus', 'mensile')).toBe('groomly_plus:mensile')
    expect(idProdottoRevenueCat('groomly_posto_extra', 'annuale')).toBe('groomly_posto_extra:annuale')
  })
})
