import { describe, expect, it } from 'vitest'
import { whatsAppAppLink, whatsAppLink } from './phone'

describe('whatsAppLink', () => {
  it('mette il prefisso italiano e tiene un numero già internazionale', () => {
    expect(whatsAppLink('333 123 4567')).toBe('https://wa.me/393331234567')
    expect(whatsAppLink('+39 333 1234567')).toBe('https://wa.me/393331234567')
    expect(whatsAppLink('0039 333 1234567')).toBe('https://wa.me/393331234567')
    expect(whatsAppLink('0333 1234567')).toBe('https://wa.me/393331234567')
  })

  it('l’app usa le stesse cifre del link web', () => {
    expect(whatsAppAppLink('333 123 4567')).toBe('whatsapp://send?phone=393331234567')
    expect(whatsAppAppLink('+39 333 1234567')).toBe(whatsAppLink('+39 333 1234567').replace('https://wa.me/', 'whatsapp://send?phone='))
  })
})