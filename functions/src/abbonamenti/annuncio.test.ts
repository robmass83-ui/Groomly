import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { annunciaPagamentiPer, dataPartenzaValida } from './annuncio'
import { emailAnnuncio } from './emailAnnuncio'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', admin: true }
const ADESSO = new Date('2026-12-01T10:00:00.000Z')
const tra = (giorni: number) => new Date(ADESSO.getTime() + giorni * 86_400_000).toISOString()

describe('dataPartenzaValida', () => {
  it('serve almeno 15 giorni (di calendario, ora di Roma)', () => {
    expect(dataPartenzaValida(tra(14), ADESSO)).toBe(false)
    expect(dataPartenzaValida(tra(15), ADESSO)).toBe(true)
    expect(dataPartenzaValida('2026-12-16T00:30:00.000+01:00', ADESSO)).toBe(true)
    expect(dataPartenzaValida('2026-12-15T23:30:00.000+01:00', ADESSO)).toBe(false)
    expect(dataPartenzaValida('domani', ADESSO)).toBe(false)
  })
})

describe('annunciaPagamentiPer', () => {
  const inviate: { email: string; lingua: string }[] = []
  const inviaEmail = vi.fn(async (a: { email: string; lingua: string; pagamentiDal: string }) => {
    if (a.email === 'rotta@x.it') throw new Error('brevo')
    inviate.push({ email: a.email, lingua: a.lingua })
  })

  beforeEach(() => {
    archivio.clear()
    inviate.length = 0
    archivio.set('config/globale', { mostraPiani: true, abbonamentiAttivi: false, piani: { provaSelfService: true } })
    archivio.set('salons/beta1/pro/main', { piano: 'base', exBeta: true })
    archivio.set('salons/early1/pro/main', { piano: 'pro', fonte: 'omaggio', earlyAdopter: true })
    archivio.set('salons/rotto/pro/main', { exBeta: true })
    archivio.set('salons/altro/pro/main', { piano: 'pro' })
    archivio.set('salons/shared/pro/main', { exBeta: true })
    archivio.set('accounts/beta1', { salonId: 'beta1', role: 'titolare', email: 'beta@x.it', lingua: 'en' })
    archivio.set('accounts/socio', { salonId: 'beta1', role: 'socio', email: 'socio@x.it' })
    archivio.set('accounts/early1', { salonId: 'early1', role: 'titolare', email: 'early@x.it' })
    archivio.set('accounts/rotto', { salonId: 'rotto', role: 'titolare', email: 'rotta@x.it' })
    archivio.set('accounts/altro', { salonId: 'altro', role: 'titolare', email: 'altro@x.it' })
    archivio.set('accounts/shared', { salonId: 'shared', role: 'titolare', email: 'shared@x.it' })
  })

  it('solo operatori', async () => {
    await expect(annunciaPagamentiPer({ operatorEmail: 'a@b.it', data: tra(20), inviaEmail, adesso: ADESSO })).rejects.toThrow('Accesso negato')
  })

  it('data troppo vicina o abbonamenti già accesi: rifiuta senza scrivere', async () => {
    await expect(annunciaPagamentiPer({ ...ROBERTO, data: tra(14), inviaEmail, adesso: ADESSO })).rejects.toThrow('Almeno 15 giorni')
    archivio.set('config/globale', { abbonamentiAttivi: true })
    await expect(annunciaPagamentiPer({ ...ROBERTO, data: tra(20), inviaEmail, adesso: ADESSO })).rejects.toThrow('Abbonamenti già attivi')
    expect(inviaEmail).not.toHaveBeenCalled()
  })

  it('salva le date e scrive solo ai titolari di ex beta ed early adopter', async () => {
    const esito = await annunciaPagamentiPer({ ...ROBERTO, data: tra(20), inviaEmail, adesso: ADESSO })
    expect(esito).toEqual({ ok: true, email: 2 })
    expect(inviate.sort((a, b) => a.email.localeCompare(b.email))).toEqual([
      { email: 'beta@x.it', lingua: 'en' },
      { email: 'early@x.it', lingua: 'it' },
    ])
    const piani = (archivio.get('config/globale') as { piani: Record<string, unknown> }).piani
    expect(piani).toMatchObject({ provaSelfService: true, annuncioPagamentiIl: ADESSO.toISOString(), pagamentiDal: tra(20) })
  })
})

describe('emailAnnuncio in francese e tedesco', () => {
  it('testi e data nella lingua', () => {
    expect(emailAnnuncio('fr', '2026-12-21T10:00:00.000Z').oggetto).toContain('Plus et Salon')
    expect(emailAnnuncio('fr', '2026-12-21T10:00:00.000Z').html).toContain('21/12/2026')
    expect(emailAnnuncio('de', '2026-12-21T10:00:00.000Z').oggetto).toContain('Plus und Salon')
    expect(emailAnnuncio('de', '2026-12-21T10:00:00.000Z').html).toContain('21.12.2026')
  })
})

describe('emailAnnuncio', () => {
  it('tre lingue con la data e niente HTML iniettato', () => {
    const it_ = emailAnnuncio('it', '2026-12-21T10:00:00.000Z')
    expect(it_.oggetto).toContain('Plus e Salon')
    expect(it_.html).toContain('21/12/2026')
    expect(emailAnnuncio('en', '2026-12-21T10:00:00.000Z').html).toContain('Go stays free')
    expect(emailAnnuncio('es', '2026-12-21T10:00:00.000Z').oggetto).toContain('Plus y Salon')
  })
})
