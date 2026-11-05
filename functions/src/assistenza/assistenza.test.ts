import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import {
  avviaAssistenzaPer,
  eliminaModelloAssistenzaPer,
  impostaStatoAssistenzaPer,
  rispondiAssistenzaPer,
  salvaModelloAssistenzaPer,
} from './assistenza'

const ADESSO = new Date('2026-11-05T10:00:00.000Z')
const posta = vi.fn(async (_to: string, _oggetto: string, _html: string) => undefined)
const dati = { fonte: 'suggerimento', id: 'x', testo: ' Grazie, lo sistemiamo ', anchEmail: false, idRichiesta: 'r1' }

function rispondi(extra: Partial<Parameters<typeof rispondiAssistenzaPer>[0]> = {}) {
  return rispondiAssistenzaPer({ admin: true, adminUid: 'adm', dati, posta, adesso: ADESSO, ...extra })
}

describe('rispondiAssistenzaPer', () => {
  beforeEach(() => {
    archivio.clear()
    posta.mockReset()
    posta.mockResolvedValue(undefined)
    archivio.set('suggerimenti/x', { uid: 'u1', salonId: 's1', email: 'chi@scrive.it', testo: 'Non va' })
    archivio.set('betaFeedback/f', { uid: 'u1', salonId: 's1' })
    archivio.set('accounts/u1', { salonId: 's1', email: 'chi@scrive.it', lingua: 'de' })
  })

  it('senza claim nega e non scrive nulla', async () => {
    await expect(rispondi({ admin: false })).rejects.toThrow('Accesso negato')
    expect(archivio.has('assistenza/suggerimento_x')).toBe(false)
  })

  it('autore senza account: errore dedicato e nulla di scritto', async () => {
    archivio.delete('accounts/u1')
    await expect(rispondi()).rejects.toThrow('non esiste più')
    expect(archivio.has('assistenza/suggerimento_x')).toBe(false)
  })

  it('manda l’avviso a chi ha scritto, nella sua lingua, e chiude la richiesta', async () => {
    await expect(rispondi()).resolves.toEqual({ ok: true, email: null })
    expect(archivio.get('accounts/u1/avvisi/r1')).toMatchObject({ tipo: 'novita', titolo: 'Antwort von Groomly', origine: 'assistenza' })
    expect(archivio.get('accounts/u1/avvisi/r1')?.testo).toContain('Grazie, lo sistemiamo')
    expect(archivio.get('accounts/u1/avvisi/r1')?.testo).toContain('info@groomlyapp.it')
    expect(archivio.get('assistenza/suggerimento_x')).toMatchObject({ fonte: 'suggerimento', idOrigine: 'x', salonId: 's1', uid: 'u1', stato: 'risolto' })
    expect(archivio.get('assistenza/suggerimento_x')?.risposte).toEqual([{ id: 'r1', testo: 'Grazie, lo sistemiamo', quando: ADESSO.toISOString(), email: null }])
  })

  it('una lingua non valida riceve l’italiano', async () => {
    archivio.set('accounts/u1', { salonId: 's1', email: 'chi@scrive.it', lingua: 'xx' })
    await rispondi()
    expect(archivio.get('accounts/u1/avvisi/r1')?.titolo).toBe('Risposta da Groomly')
  })

  it('funziona anche su un feedback beta', async () => {
    await rispondi({ dati: { ...dati, fonte: 'feedback', id: 'f' } })
    expect(archivio.get('assistenza/feedback_f')).toMatchObject({ fonte: 'feedback', uid: 'u1' })
  })

  it('un secondo tocco con lo stesso id non aggiunge una risposta', async () => {
    await rispondi({ dati: { ...dati, anchEmail: true } })
    await rispondi({ dati: { ...dati, anchEmail: true } })
    expect(archivio.get('assistenza/suggerimento_x')?.risposte).toHaveLength(1)
    expect(posta).toHaveBeenCalledTimes(1)
  })

  it('l’email è di servizio: niente Disiscriviti, nella lingua dell’account', async () => {
    await expect(rispondi({ dati: { ...dati, anchEmail: true } })).resolves.toEqual({ ok: true, email: 'inviata' })
    const [to, oggetto, html] = posta.mock.calls[0] as [string, string, string]
    expect(to).toBe('chi@scrive.it')
    expect(oggetto).toBe('Antwort von Groomly')
    expect(html).toContain('Grazie, lo sistemiamo')
    expect(html).toContain('info@groomlyapp.it')
    expect(html).not.toContain('mode=promo')
    expect(html.toLowerCase()).not.toContain('abmelden')
    expect(archivio.get('assistenza/suggerimento_x')?.risposte).toMatchObject([{ email: 'inviata' }])
  })

  it('l’email rifiutata non disfa la risposta', async () => {
    posta.mockRejectedValue(new Error('Brevo'))
    await expect(rispondi({ dati: { ...dati, anchEmail: true } })).resolves.toEqual({ ok: true, email: 'non_inviata' })
    expect(archivio.get('accounts/u1/avvisi/r1')).toBeDefined()
    expect(archivio.get('assistenza/suggerimento_x')?.risposte).toMatchObject([{ email: 'non_inviata' }])
    expect(archivio.get('sistema/postaGiorno')?.n).toBe(0)
  })

  it('oltre il limite del giorno l’email non parte ma la risposta sì', async () => {
    archivio.set('sistema/postaGiorno', { giorno: '2026-11-05', n: 300 })
    await expect(rispondi({ dati: { ...dati, anchEmail: true } })).resolves.toEqual({ ok: true, email: 'limite' })
    expect(posta).not.toHaveBeenCalled()
    expect(archivio.get('assistenza/suggerimento_x')?.risposte).toMatchObject([{ email: 'limite' }])
  })

  it('l’email conta nel totale del giorno', async () => {
    await rispondi({ dati: { ...dati, anchEmail: true } })
    expect(archivio.get('sistema/postaGiorno')?.n).toBe(1)
  })

  it.each([
    [{ ...dati, testo: '   ' }],
    [{ ...dati, testo: 'x'.repeat(2001) }],
    [{ ...dati, fonte: 'boh' }],
    [{ ...dati, id: 'a/b' }],
    [{ ...dati, idRichiesta: '' }],
    [{ ...dati, id: 'assente' }],
  ])('rifiuta una richiesta non valida: %#', async (sbagliati) => {
    await expect(rispondi({ dati: sbagliati })).rejects.toThrow('Richiesta non valida')
  })

  it('la 31ª risposta dell’ora si ferma', async () => {
    archivio.set('assistenzaLimiti/adm', { hits: Array.from({ length: 30 }, () => ADESSO.getTime() - 1000) })
    await expect(rispondi()).rejects.toThrow('Troppe richieste')
  })
})

describe('impostaStatoAssistenzaPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('suggerimenti/x', { uid: 'u1', salonId: 's1' })
  })

  it('crea il documento con chi ha scritto, così si cancella con lui', async () => {
    await impostaStatoAssistenzaPer({ admin: true, dati: { fonte: 'suggerimento', id: 'x', stato: 'in-corso' }, adesso: ADESSO })
    expect(archivio.get('assistenza/suggerimento_x')).toMatchObject({ uid: 'u1', salonId: 's1', stato: 'in-corso' })
  })

  it('conserva le risposte già date', async () => {
    archivio.set('assistenza/suggerimento_x', { stato: 'risolto', risposte: [{ id: 'r' }] })
    await impostaStatoAssistenzaPer({ admin: true, dati: { fonte: 'suggerimento', id: 'x', stato: 'nuovo' }, adesso: ADESSO })
    expect(archivio.get('assistenza/suggerimento_x')).toMatchObject({ stato: 'nuovo', risposte: [{ id: 'r' }] })
  })

  it('rifiuta uno stato sconosciuto e chi non è admin', async () => {
    await expect(impostaStatoAssistenzaPer({ admin: true, dati: { fonte: 'suggerimento', id: 'x', stato: 'boh' }, adesso: ADESSO })).rejects.toThrow('Richiesta non valida')
    await expect(impostaStatoAssistenzaPer({ admin: false, dati: { fonte: 'suggerimento', id: 'x', stato: 'nuovo' }, adesso: ADESSO })).rejects.toThrow('Accesso negato')
  })
})

describe('avviaAssistenzaPer', () => {
  it('fissa il taglio una volta sola', async () => {
    archivio.clear()
    await expect(avviaAssistenzaPer({ admin: true, adesso: ADESSO })).resolves.toEqual({ dal: ADESSO.toISOString() })
    await expect(avviaAssistenzaPer({ admin: true, adesso: new Date('2027-01-01T00:00:00.000Z') })).resolves.toEqual({ dal: ADESSO.toISOString() })
  })

  it('senza claim nega', async () => {
    await expect(avviaAssistenzaPer({ admin: false, adesso: ADESSO })).rejects.toThrow('Accesso negato')
  })
})

describe('modelli di risposta', () => {
  it('salva, aggiorna ed elimina', async () => {
    archivio.clear()
    const { id } = await salvaModelloAssistenzaPer({ admin: true, dati: { titolo: ' Grazie ', testo: ' Ti ringrazio ' } })
    expect(archivio.get(`assistenzaModelli/${id}`)).toEqual({ titolo: 'Grazie', testo: 'Ti ringrazio' })
    await salvaModelloAssistenzaPer({ admin: true, dati: { id, titolo: 'Altro', testo: 'Testo' } })
    expect(archivio.get(`assistenzaModelli/${id}`)).toEqual({ titolo: 'Altro', testo: 'Testo' })
    await eliminaModelloAssistenzaPer({ admin: true, id })
    expect(archivio.has(`assistenzaModelli/${id}`)).toBe(false)
  })

  it('rifiuta un modello vuoto e chi non è admin', async () => {
    await expect(salvaModelloAssistenzaPer({ admin: true, dati: { titolo: '', testo: 'x' } })).rejects.toThrow('Richiesta non valida')
    await expect(eliminaModelloAssistenzaPer({ admin: false, id: 'x' })).rejects.toThrow('Accesso negato')
  })
})
