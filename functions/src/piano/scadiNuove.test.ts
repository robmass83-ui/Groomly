import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio, postBrevoHtml, warn } = vi.hoisted(() => ({
  archivio: new Map<string, Record<string, unknown>>(),
  postBrevoHtml: vi.fn(async () => undefined),
  warn: vi.fn(),
}))
vi.mock('firebase-functions/logger', () => ({ warn, error: vi.fn(), info: vi.fn(), log: vi.fn(), debug: vi.fn() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))
vi.mock('../brevoMail', async (originale) => ({ ...(await originale<object>()), postBrevoHtml }))

import { scadiProposteScadute } from './scadiProposte'

const adesso = new Date('2026-11-02T08:00:00.000Z')

function richiesta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'nuova',
    nome: 'Ada',
    cane: 'Fido',
    email: 'a@b.it',
    phone: '333',
    start: '2026-11-01T09:00:00.000Z',
    end: '2026-11-01T10:00:00.000Z',
    ...extra,
  }
}

describe('scadiProposteScadute: richieste nuove passate', () => {
  beforeEach(() => {
    archivio.clear()
    postBrevoHtml.mockClear()
    warn.mockClear()
    archivio.set('salons/s1/settings/main', { business: { phone: ' 333 1234567 ' }, linguaClienti: 'it' })
    archivio.set('accounts/s1', { email: 'salone@esempio.it' })
  })

  it('una nuova passata diventa scaduta e il cliente riceve una mail', async () => {
    archivio.set('salons/s1/richieste/r1', richiesta())
    await scadiProposteScadute('chiave', adesso)
    expect(archivio.get('salons/s1/richieste/r1')).toMatchObject({ status: 'scaduta', emailStato: 'inviata' })
    expect(postBrevoHtml).toHaveBeenCalledTimes(1)
    const chiamata = postBrevoHtml.mock.calls[0] as unknown as string[]
    expect(chiamata[1]).toBe('a@b.it')
    expect(chiamata[3]).toContain('333 1234567')
    expect(warn).not.toHaveBeenCalled()
  })

  it('la seconda passata non manda un’altra mail', async () => {
    archivio.set('salons/s1/richieste/r1', richiesta())
    await scadiProposteScadute('chiave', adesso)
    await scadiProposteScadute('chiave', adesso)
    expect(postBrevoHtml).toHaveBeenCalledTimes(1)
  })

  it('senza email la richiesta scade lo stesso', async () => {
    archivio.set('salons/s1/richieste/r1', richiesta({ email: '' }))
    await scadiProposteScadute('chiave', adesso)
    expect(archivio.get('salons/s1/richieste/r1')).toMatchObject({ status: 'scaduta', emailStato: 'non_inviata' })
    expect(postBrevoHtml).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('Mail di scadenza non inviata', { salonId: 's1', id: 'r1' })
  })

  it('se Brevo fallisce la richiesta resta scaduta e si scrive nel log', async () => {
    postBrevoHtml.mockRejectedValueOnce(new Error('brevo giù'))
    archivio.set('salons/s1/richieste/r1', richiesta())
    await scadiProposteScadute('chiave', adesso)
    expect(archivio.get('salons/s1/richieste/r1')).toMatchObject({ status: 'scaduta', emailStato: 'non_inviata' })
    expect(warn).toHaveBeenCalledWith('Mail di scadenza non inviata', { salonId: 's1', id: 'r1' })
  })

  it('una nuova di domani resta nuova e nessuna mail', async () => {
    archivio.set('salons/s1/richieste/r1', richiesta({ start: '2026-11-03T09:00:00.000Z', end: '2026-11-03T10:00:00.000Z' }))
    await scadiProposteScadute('chiave', adesso)
    expect(archivio.get('salons/s1/richieste/r1')?.status).toBe('nuova')
    expect(postBrevoHtml).not.toHaveBeenCalled()
  })
})
