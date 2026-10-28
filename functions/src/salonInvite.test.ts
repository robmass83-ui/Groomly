import { describe, expect, it } from 'vitest'
import {
  appendOpenInviteExpiry,
  deliverInvite,
  inviteMail,
  removeOneOpenInviteExpiry,
  shouldRestoreAccount,
  tokenBytes,
} from './salonInvite'

describe('invito', () => {
  it('prepara l’HTML dell’invito con link, salone e ruolo', () => {
    const mail = inviteMail('abc', 'Pelo', 'socio')
    expect(mail.oggetto).toBe('Pelo ti invita su Groomly')
    expect(mail.html).toContain('groomly-logo')
    expect(mail.html).toContain('<a ')
    expect(mail.html).toContain('Pelo')
    expect(mail.html).toContain('Socio')
    expect(mail.html).toContain('https://groomly-3128b.web.app/invito/abc')
    expect(inviteMail('abc', 'Pelo', 'socio', 'en').html).toContain('Partner')
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

  it('ripristina l’account solo se è ancora in questo salone', () => {
    expect(shouldRestoreAccount('salon-a', 'salon-a')).toBe(true)
    expect(shouldRestoreAccount('salon-b', 'salon-a')).toBe(false)
    expect(shouldRestoreAccount('', 'salon-a')).toBe(false)
  })

  it('accoda una scadenza anche se un altro invito scade nello stesso istante', () => {
    const same = '2099-01-01T00:00:00.000Z'
    expect(appendOpenInviteExpiry(undefined, same)).toEqual([same])
    expect(appendOpenInviteExpiry([same], same)).toEqual([same, same])
  })

  it('toglie una sola scadenza quando due inviti scadono nello stesso istante', () => {
    const same = '2099-01-01T00:00:00.000Z'
    const other = '2099-02-01T00:00:00.000Z'
    expect(removeOneOpenInviteExpiry([same, other, same], same)).toEqual([other, same])
    expect(removeOneOpenInviteExpiry([same], same)).toEqual([])
    expect(removeOneOpenInviteExpiry(undefined, same)).toBeNull()
    expect(removeOneOpenInviteExpiry([other], same)).toBeNull()
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
