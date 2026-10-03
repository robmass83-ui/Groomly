import { describe, expect, it } from 'vitest'
import { loginSchema, serviceFormSchema } from './schemas'

describe('loginSchema', () => {
  it('rifiuta email vuota e password corta', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'corta' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'maria@salone.it', password: 'segretissimo' }).success).toBe(true)
  })
})

describe('serviceFormSchema', () => {
  it('copia prezzo e durata extra sulle tre taglie', () => {
    const parsed = serviceFormSchema.parse({
      kind: 'extra',
      name: '  Nodi extra  ',
      active: true,
      durationMin: '20',
      price: '5,50',
    })
    expect(parsed.name).toBe('Nodi extra')
    expect(parsed.durationMin).toEqual({ piccola: 20, media: 20, grande: 20 })
    expect(parsed.price).toEqual({ piccola: 5.5, media: 5.5, grande: 5.5 })
  })

  it('rifiuta durata non intera, prezzo negativo e nome vuoto', () => {
    expect(serviceFormSchema.safeParse({
      kind: 'principale', name: '   ', active: true,
      durationMin: { piccola: '1.5', media: '30', grande: '30' },
      price: { piccola: '10', media: '10', grande: '-1' },
    }).success).toBe(false)
  })
})
