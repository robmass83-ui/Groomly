import { beforeEach, describe, expect, it } from 'vitest'
import { dimenticaInvito, invitoInSospeso, ricordaInvito } from './invitoInSospeso'

const TOKEN = 'a'.repeat(64)

describe('invitoInSospeso', () => {
  beforeEach(() => localStorage.clear())

  it('ricorda e rilegge il token', () => {
    ricordaInvito(TOKEN)
    expect(invitoInSospeso()).toBe(TOKEN)
  })

  it('dopo 8 giorni non c\'è più', () => {
    const adesso = new Date('2026-11-02T10:00:00Z')
    ricordaInvito(TOKEN, adesso)
    expect(invitoInSospeso(new Date('2026-11-10T10:00:01Z'))).toBeNull()
    expect(invitoInSospeso(new Date('2026-11-05T10:00:00Z'))).toBe(TOKEN)
  })

  it('JSON rotto vale null', () => {
    localStorage.setItem('groomly.invitoInSospeso', '{non json')
    expect(invitoInSospeso()).toBeNull()
  })

  it('dimenticaInvito lo toglie', () => {
    ricordaInvito(TOKEN)
    dimenticaInvito()
    expect(invitoInSospeso()).toBeNull()
  })

  it('un token non esadecimale da 64 non si salva', () => {
    ricordaInvito('xyz')
    ricordaInvito('G'.repeat(64))
    expect(localStorage.getItem('groomly.invitoInSospeso')).toBeNull()
    expect(invitoInSospeso()).toBeNull()
  })
})
