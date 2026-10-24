import { describe, expect, it } from 'vitest'
import { deliverInvite, inviteMail, tokenBytes } from './salonInvite'

describe('invito', () => {
  it('prepara il template 5 con link, salone e ruolo', () => {
    expect(inviteMail('abc', 'Pelo', 'socio')).toEqual({
      templateId: 5,
      params: {
        link: 'https://groomly-3128b.web.app/invito/abc',
        salonName: 'Pelo',
        roleLabel: 'Socio',
      },
    })
  })

  it('crea un token di 64 caratteri esadecimali', () => {
    expect(tokenBytes()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('se l’invio fallisce cancella l’invito e rilancia', async () => {
    let removed = false
    await expect(deliverInvite(
      async () => {
        throw new Error('Invio non riuscito')
      },
      async () => {
        removed = true
      },
    )).rejects.toThrow('Invio non riuscito')
    expect(removed).toBe(true)
  })

  it('se l’invio riesce non cancella l’invito', async () => {
    let removed = false
    await deliverInvite(async () => {}, async () => {
      removed = true
    })
    expect(removed).toBe(false)
  })

  it('se la cancellazione fallisce rilancia comunque il rifiuto dell’invio', async () => {
    let attempted = false
    await expect(deliverInvite(
      async () => {
        throw new Error('Invio non riuscito')
      },
      async () => {
        attempted = true
        throw new Error('cancellazione')
      },
    )).rejects.toThrow('Invio non riuscito')
    expect(attempted).toBe(true)
  })
})
