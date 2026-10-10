import { describe, expect, it } from 'vitest'
import { whatsAppLink } from './phone'

describe('whatsAppLink', () => {
  it('mette il prefisso italiano e tiene un numero già internazionale', () => {
    expect(whatsAppLink('333 123 4567')).toBe('https://wa.me/393331234567')
    expect(whatsAppLink('+39 333 1234567')).toBe('https://wa.me/393331234567')
    expect(whatsAppLink('0039 333 1234567')).toBe('https://wa.me/393331234567')
    expect(whatsAppLink('0333 1234567')).toBe('https://wa.me/393331234567')
  })
})