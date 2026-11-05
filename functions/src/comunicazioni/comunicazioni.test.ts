import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import {
  anteprimaComunicazionePer,
  eliminaComunicazionePer,
  inviaComunicazionePer,
  riprendiComunicazionePer,
} from './comunicazioni'
import { selezionaDestinatari } from './destinatari'

const ADESSO = new Date('2026-11-05T10:00:00.000Z')
const RECENTE = ADESSO.getTime() / 1000 - 60
const VECCHIO = ADESSO.getTime() / 1000 - 3600
const posta = vi.fn(async (_to: string, _oggetto: string, _html: string, _headers?: Record<string, string>) => undefined)
const testi = { it: { titolo: 'Manutenzione', testo: 'Domenica' }, de: { titolo: 'Wartung', testo: 'Sonntag' } }
const base = { tipo: 'manutenzione', salonIds: ['s1', 's2'], testi, email: 'nessuna', idRichiesta: 'c1' }
const db = () => getFirestore() as unknown as Firestore

function invia(dati: Record<string, unknown> = {}, extra: Partial<Parameters<typeof inviaComunicazionePer>[0]> = {}) {
  return inviaComunicazionePer({ admin: true, adminUid: 'adm', authTime: RECENTE, dati: { ...base, ...dati }, posta, adesso: ADESSO, ...extra })
}

beforeEach(() => {
  archivio.clear()
  posta.mockReset()
  posta.mockResolvedValue(undefined)
  archivio.set('accounts/t1', { salonId: 's1', role: 'titolare', email: 't1@a.it', lingua: 'de', emailPromo: { attivo: true, at: 'x', fonte: 'account', token: 'a'.repeat(32) } })
  archivio.set('accounts/c1', { salonId: 's1', role: 'collaboratore', email: 'c1@a.it', lingua: 'it' })
  archivio.set('accounts/t2', { salonId: 's2', role: 'titolare', email: 't2@a.it', lingua: 'fr' })
  archivio.set('accounts/t3', { salonId: 's3', role: 'titolare', email: 't3@a.it', lingua: 'xx' })
  archivio.set('accounts/laura', { salonId: 'shared', role: 'titolare', email: 'laura@a.it' })
  archivio.set('accounts/finto', { salonId: 's1', role: 'socio', email: 'salone1@test.groomly' })
  archivio.set('accounts/finto2', { salonId: 's9', role: 'titolare', email: 'salone9@test.groomly' })
})

describe('selezionaDestinatari', () => {
  it('tutti: comprende gli account shared e lascia fuori quelli di test', async () => {
    const { account, titolari } = await selezionaDestinatari(db(), 'tutti')
    expect(account.map((a) => a.uid).sort()).toEqual(['c1', 'laura', 't1', 't2', 't3'])
    expect(titolari.map((a) => a.uid).sort()).toEqual(['laura', 't1', 't2', 't3'])
  })

  it('filtro: solo i saloni scelti', async () => {
    const { account, titolari } = await selezionaDestinatari(db(), ['s1'])
    expect(account.map((a) => a.uid).sort()).toEqual(['c1', 't1'])
    expect(titolari.map((a) => a.uid)).toEqual(['t1'])
  })

  it('una lingua non valida vale italiano', async () => {
    const { account } = await selezionaDestinatari(db(), ['s3'])
    expect(account[0]?.lingua).toBe('it')
  })
})

describe('anteprimaComunicazionePer', () => {
  it('conta account, email, chi riceve l’italiano e chi non ha il consenso', async () => {
    await expect(anteprimaComunicazionePer({ admin: true, dati: { ...base, email: 'promozionale' }, adesso: ADESSO })).resolves.toEqual({
      account: 3,
      email: 1,
      inItaliano: 1,
      senzaConsenso: 1,
      restanoOggi: 300,
      massimo: 150,
      bloccata: false,
    })
  })

  it('di servizio conta tutti i titolari', async () => {
    const esito = await anteprimaComunicazionePer({ admin: true, dati: { ...base, email: 'servizio' }, adesso: ADESSO })
    expect(esito).toMatchObject({ email: 2, senzaConsenso: 0 })
  })

  it('oltre metà del margine è bloccata', async () => {
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 298 })
    const esito = await anteprimaComunicazionePer({ admin: true, dati: { ...base, email: 'servizio' }, adesso: ADESSO })
    expect(esito).toMatchObject({ restanoOggi: 2, massimo: 1, bloccata: true })
  })

  it('senza email non è mai bloccata', async () => {
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 300 })
    const esito = await anteprimaComunicazionePer({ admin: true, dati: base, adesso: ADESSO })
    expect(esito).toMatchObject({ email: 0, bloccata: false })
  })

  it('senza claim nega', async () => {
    await expect(anteprimaComunicazionePer({ admin: false, dati: base, adesso: ADESSO })).rejects.toThrow('Accesso negato')
  })
})

describe('inviaComunicazionePer', () => {
  it('a tutti con l’accesso vecchio chiede la riconferma e non scrive', async () => {
    await expect(invia({ salonIds: 'tutti' }, { authTime: VECCHIO })).rejects.toThrow('Conferma la password per continuare')
    expect(archivio.has('avvisiSistema/c1')).toBe(false)
  })

  it('a un filtro con l’accesso vecchio passa', async () => {
    await expect(invia({}, { authTime: VECCHIO })).resolves.toMatchObject({ id: 'c1' })
  })

  it.each([
    [{ testi: { de: { titolo: 'X', testo: 'Y' } } }],
    [{ testi: { it: { titolo: '  ', testo: 'Y' } } }],
    [{ tipo: 'boh' }],
    [{ email: 'boh' }],
    [{ salonIds: [] }],
    [{ idRichiesta: '' }],
  ])('rifiuta una comunicazione non valida: %#', async (dati) => {
    await expect(invia(dati)).rejects.toThrow('Richiesta non valida')
  })

  it('senza claim nega', async () => {
    await expect(invia({}, { admin: false })).rejects.toThrow('Accesso negato')
  })

  it('a tutti scrive un solo avviso, con l’italiano in titolo e testo', async () => {
    await invia({ salonIds: 'tutti' })
    expect(archivio.get('avvisiSistema/c1')).toMatchObject({ tipo: 'manutenzione', titolo: 'Manutenzione', testo: 'Domenica', traduzioni: { de: { titolo: 'Wartung', testo: 'Sonntag' } } })
    expect([...archivio.keys()].filter((k) => k.includes('/avvisi/'))).toEqual([])
  })

  it('a un filtro scrive un avviso per account e ricorda chi', async () => {
    await invia()
    expect(archivio.get('accounts/t1/avvisi/c1')).toMatchObject({ titolo: 'Manutenzione', origine: 'comunicazione', comunicazioneId: 'c1' })
    expect(archivio.has('accounts/c1/avvisi/c1')).toBe(true)
    expect(archivio.has('accounts/t2/avvisi/c1')).toBe(true)
    expect(archivio.has('accounts/t3/avvisi/c1')).toBe(false)
    expect((archivio.get('comunicazioni/c1')?.uids as string[]).sort()).toEqual(['c1', 't1', 't2'])
    expect(archivio.has('avvisiSistema/c1')).toBe(false)
  })

  it('la promozionale parte solo col consenso e porta il Disiscriviti', async () => {
    await expect(invia({ email: 'promozionale' })).resolves.toMatchObject({ inviate: 1, nonInviate: 0 })
    expect(posta).toHaveBeenCalledTimes(1)
    const [to, oggetto, html, headers] = posta.mock.calls[0] as [string, string, string, Record<string, string>]
    expect(to).toBe('t1@a.it')
    expect(oggetto).toBe('Wartung')
    expect(html).toContain('Sonntag')
    expect(html).toContain('mode=promo')
    expect(headers['List-Unsubscribe']).toContain('mode=promo')
  })

  it('quella di servizio va a tutti i titolari senza il link', async () => {
    await expect(invia({ email: 'servizio' })).resolves.toMatchObject({ inviate: 2 })
    const chiamate = posta.mock.calls as unknown as [string, string, string, Record<string, string> | undefined][]
    expect(chiamate.map((c) => c[0]).sort()).toEqual(['t1@a.it', 't2@a.it'])
    for (const [, , html, headers] of chiamate) {
      expect(html).not.toContain('mode=promo')
      expect(headers).toBeUndefined()
    }
  })

  it('una lingua senza testo riceve l’italiano', async () => {
    await invia({ email: 'servizio', salonIds: ['s2'] })
    expect(posta.mock.calls[0]?.[1]).toBe('Manutenzione')
  })

  it('oltre il margine non invia nulla e non scrive avvisi', async () => {
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 299 })
    await expect(invia({ email: 'servizio' })).rejects.toThrow('Limite di email di oggi raggiunto')
    expect(posta).not.toHaveBeenCalled()
    expect(archivio.has('accounts/t1/avvisi/c1')).toBe(false)
    expect(archivio.has('comunicazioni/c1')).toBe(false)
  })

  it('le email entrano nel conto del giorno', async () => {
    await invia({ email: 'servizio' })
    expect(archivio.get('sistema/postaGiorno')?.n).toBe(2)
  })

  it('un secondo tocco con lo stesso id non rimanda nulla', async () => {
    await invia({ email: 'servizio' })
    await invia({ email: 'servizio' })
    expect(posta).toHaveBeenCalledTimes(2)
    expect(archivio.get('sistema/postaGiorno')?.n).toBe(2)
  })

  it('oltre il limite di frequenza si ferma', async () => {
    archivio.set('avvisiLimiti/adm', { hits: Array.from({ length: 10 }, () => ADESSO.getTime() - 1000) })
    await expect(invia()).rejects.toThrow('Troppe richieste')
  })

  it('segna ogni email partita', async () => {
    await invia({ email: 'servizio' })
    expect(archivio.get('comunicazioni/c1/invii/t1')).toMatchObject({ esito: 'inviata' })
    expect(archivio.get('comunicazioni/c1')).toMatchObject({ email: 2, inviate: 2 })
  })
})

describe('riprendiComunicazionePer', () => {
  it('manda solo a chi manca', async () => {
    posta.mockImplementation(async (to) => {
      if (to === 't2@a.it') throw new Error('Brevo')
    })
    await expect(invia({ email: 'servizio' })).resolves.toMatchObject({ inviate: 1, nonInviate: 1 })
    posta.mockReset()
    posta.mockResolvedValue(undefined)
    await expect(riprendiComunicazionePer({ admin: true, adminUid: 'adm', id: 'c1', posta, adesso: ADESSO })).resolves.toMatchObject({ inviate: 2, nonInviate: 0 })
    expect(posta).toHaveBeenCalledTimes(1)
    expect(posta.mock.calls[0]?.[0]).toBe('t2@a.it')
  })

  it('se tutto è partito non manda nulla', async () => {
    await invia({ email: 'servizio' })
    posta.mockClear()
    await riprendiComunicazionePer({ admin: true, adminUid: 'adm', id: 'c1', posta, adesso: ADESSO })
    expect(posta).not.toHaveBeenCalled()
  })

  it('oltre il margine si ferma e lo dice', async () => {
    posta.mockRejectedValue(new Error('Brevo'))
    await invia({ email: 'servizio' })
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 300 })
    await expect(riprendiComunicazionePer({ admin: true, adminUid: 'adm', id: 'c1', posta, adesso: ADESSO })).rejects.toThrow('Limite di email di oggi raggiunto')
  })

  it('una comunicazione che non c’è è una richiesta non valida', async () => {
    await expect(riprendiComunicazionePer({ admin: true, adminUid: 'adm', id: 'zz', posta, adesso: ADESSO })).rejects.toThrow('Richiesta non valida')
  })
})

describe('eliminaComunicazionePer', () => {
  it('filtro: toglie l’avviso a ogni destinatario e tiene lo storico', async () => {
    await invia()
    await eliminaComunicazionePer({ admin: true, id: 'c1' })
    expect(archivio.has('accounts/t1/avvisi/c1')).toBe(false)
    expect(archivio.has('accounts/t2/avvisi/c1')).toBe(false)
    expect(archivio.get('comunicazioni/c1')).toMatchObject({ eliminata: true })
  })

  it('tutti: toglie l’avviso globale', async () => {
    await invia({ salonIds: 'tutti' })
    await eliminaComunicazionePer({ admin: true, id: 'c1' })
    expect(archivio.has('avvisiSistema/c1')).toBe(false)
  })

  it('senza claim nega', async () => {
    await expect(eliminaComunicazionePer({ admin: false, id: 'c1' })).rejects.toThrow('Accesso negato')
  })
})
