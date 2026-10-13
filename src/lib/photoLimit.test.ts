import { describe, expect, it } from 'vitest'
import { MAX_DOG_PHOTOS, TOO_MANY_PHOTOS, dogPhotoCount } from './photoLimit'

describe('photoLimit', () => {
  it('conta profilo e galleria senza doppioni', () => {
    expect(dogPhotoCount({ photo: 'file:a', gallery: [{ photo: 'file:a' }, { photo: 'file:b' }] })).toBe(2)
    expect(dogPhotoCount({ gallery: [] })).toBe(0)
  })

  it('tetto e messaggio', () => {
    expect(MAX_DOG_PHOTOS).toBe(20)
    expect(TOO_MANY_PHOTOS).toBe('Puoi caricare al massimo 20 foto per cane.')
  })
})
