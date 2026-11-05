import { describe, expect, it, vi } from 'vitest'
import type { EmailPromo } from '../../../src/lib/versioneLegale'
import { disiscriviPromoPer, impostaEmailPromoPer, type ArchivioPromo } from './consensoPromo'
import { inviaPromo } from './inviaPromo'

const adesso = new Date('2026-11-05T10:00:00.000Z')
const token = 'a'.repeat(32)

function memoria(emailPromo?: EmailPromo): ArchivioPromo & { emailPromo?: EmailPromo; righe: Record<string, unknown>[] } {
  const righe: Record<string, unknown>[] = []
  return {
    emailPromo,
    righe,
    async leggi() {
      return { email: 'ada@salone.it', lingua: 'fr', emailPromo: this.emailPromo }
    },
    async scrivi(_uid, valore, riga) {
      this.emailPromo = valore
      if (riga) righe.push(riga)
    },
  }
}

describe('impostaEmailPromoPer', () => {
  it('scrive la scelta e la riga di registro', async () => {
    const archivio = memoria()
    await impostaEmailPromoPer({ uid: 'u', attivo: true, fonte: 'tour' }, archivio, adesso)
    expect(archivio.emailPromo).toEqual({ attivo: true, at: adesso.toISOString(), fonte: 'tour' })
    expect(archivio.righe).toEqual([{ tipo: 'email-promo', attivo: true, fonte: 'tour', at: adesso.toISOString() }])
  })

  it('tiene il token già assegnato', async () => {
    const archivio = memoria({ attivo: true, at: 'x', fonte: 'tour', token })
    await impostaEmailPromoPer({ uid: 'u', attivo: false, fonte: 'account' }, archivio, adesso)
    expect(archivio.emailPromo?.token).toBe(token)
  })
})

describe('disiscriviPromoPer', () => {
  it('un token sbagliato non spegne', async () => {
    const archivio = memoria({ attivo: true, at: 'x', fonte: 'tour', token })
    await expect(disiscriviPromoPer({ uid: 'u', token: 'b'.repeat(32) }, archivio, adesso)).rejects.toMatchObject({ code: 'not-found' })
    expect(archivio.emailPromo?.attivo).toBe(true)
  })

  it('il token giusto spegne, e ripetere non dà errore', async () => {
    const archivio = memoria({ attivo: true, at: 'x', fonte: 'tour', token })
    await disiscriviPromoPer({ uid: 'u', token }, archivio, adesso)
    await disiscriviPromoPer({ uid: 'u', token }, archivio, adesso)
    expect(archivio.emailPromo).toMatchObject({ attivo: false, fonte: 'link' })
    expect(archivio.righe).toHaveLength(1)
  })
})

describe('inviaPromo', () => {
  it('senza consenso non spedisce', async () => {
    const posta = vi.fn(async () => undefined)
    for (const archivio of [memoria(), memoria({ attivo: false, at: 'x', fonte: 'link' })]) {
      expect(await inviaPromo({ uid: 'u', oggetto: 'o', html: '<p>x</p>', apiKey: 'k' }, archivio, posta)).toBe('senza-consenso')
    }
    expect(posta).not.toHaveBeenCalled()
  })

  it('con il consenso crea il token e aggiunge il link nella lingua dell’account', async () => {
    const posta = vi.fn(async () => undefined)
    const archivio = memoria({ attivo: true, at: 'x', fonte: 'tour' })
    expect(await inviaPromo({ uid: 'u', oggetto: 'o', html: '<p>x</p>', apiKey: 'k' }, archivio, posta)).toBe('inviata')
    expect(archivio.emailPromo?.token).toMatch(/^[a-f0-9]{32}$/)
    expect(archivio.righe).toEqual([])
    const [to, oggetto, html, headers] = posta.mock.calls[0] as unknown as [string, string, string, Record<string, string>]
    expect(to).toBe('ada@salone.it')
    expect(oggetto).toBe('o')
    expect(html).toContain('mode=promo&amp;uid=u')
    expect(html).toContain('Se désabonner')
    expect(headers['List-Unsubscribe']).toContain('mode=promo')
  })
})
