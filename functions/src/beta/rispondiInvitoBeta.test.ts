import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { rispondiInvitoBetaPer } from './rispondiInvitoBeta'

const ADESSO = new Date('2026-11-04T10:00:00.000Z')
const FUTURO = '2026-11-18T10:00:00.000Z'

function invito(over: Record<string, unknown> = {}) {
  archivio.set('betaInviti/s1', {
    salonId: 's1', piano: 'salone', giorni: 60, messaggio: null, stato: 'invitato', invitatoIl: ADESSO.toISOString(),
    scadeInvitoIl: FUTURO, rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null,
    invitatoDa: 'masala.roberto@hotmail.it', aggiornatoIl: ADESSO.toISOString(), ...over,
  })
}

function rispondi(dati: unknown, uid = 's1', posta = vi.fn(async () => undefined), adesso = ADESSO) {
  return rispondiInvitoBetaPer({ uid, dati, adesso, apiKey: 'k', posta })
}

describe('rispondiInvitoBetaPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('accounts/s1', { salonId: 's1', role: 'titolare', email: 'anna@example.it', firstName: 'Anna', lastName: 'B' })
    archivio.set('salons/s1/avvisi/beta', { tipo: 'invito', piano: 'salone', letto: false })
    invito()
  })

  it('solo il titolare risponde', async () => {
    archivio.set('accounts/socio', { salonId: 's1', role: 'socio' })
    await expect(rispondi({ accetta: true }, 'socio')).rejects.toThrow('Solo il titolare può rispondere all’invito')
    await expect(rispondi({ accetta: true }, 'shared')).rejects.toThrow('Solo il titolare può rispondere all’invito')
    await expect(rispondi({ accetta: 'si' })).rejects.toThrow('Risposta non valida: riprova')
  })

  it('senza invito aperto: non più valido', async () => {
    invito({ stato: 'rifiutato' })
    await expect(rispondi({ accetta: true })).rejects.toThrow('Questo invito non è più valido')
    archivio.delete('betaInviti/s1')
    await expect(rispondi({ accetta: true })).rejects.toThrow('Questo invito non è più valido')
  })

  it('invito scaduto: lo segna scaduto e rifiuta', async () => {
    await expect(rispondi({ accetta: true }, 's1', vi.fn(), new Date('2026-11-19T00:00:00.000Z'))).rejects.toThrow('Questo invito è scaduto')
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'scaduto' })
    expect(archivio.has('salons/s1/pro/main')).toBe(false)
  })

  it('accetta Salon: piano beta a 3 posti, traccia, membro titolare, invito e avviso', async () => {
    const esito = await rispondi({ accetta: true })
    const fine = '2027-01-03T10:00:00.000Z'
    expect(esito).toEqual({ ok: true, scadeIl: fine })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({
      piano: 'salone', stato: 'attivo', fonte: 'beta', scadeIl: fine, seatsIncluded: 3, seats: 3, enabled: true,
      provaUsata: true, rinnovoAutomatico: false,
      exBeta: true, betaPiano: 'salone', betaDal: ADESSO.toISOString(), betaFinoAl: fine, earlyAdopter: true,
    })
    expect(archivio.get('salons/s1/members/s1')).toMatchObject({ uid: 's1', role: 'titolare', email: 'anna@example.it' })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'accettato', rispostoIl: ADESSO.toISOString() })
    expect(archivio.get('salons/s1/avvisi/beta')).toMatchObject({ letto: true })
  })

  it('la beta sostituisce la prova; VIP e piano manuale no', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: FUTURO, provaUsata: true })
    await rispondi({ accetta: true })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({ fonte: 'beta', piano: 'salone' })

    invito()
    archivio.set('salons/s1/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null })
    await expect(rispondi({ accetta: true })).rejects.toThrow('Hai già il piano Salon omaggio: l’invito non serve')
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null })
    await expect(rispondi({ accetta: true })).rejects.toThrow('Hai già un piano attivo: l’invito non serve')
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'invitato' })
  })

  it('una traccia earlyAdopter falsa torna vera all’accettazione', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'base', stato: 'scaduto', fonte: null, earlyAdopter: false, exBeta: true })
    await rispondi({ accetta: true })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({ earlyAdopter: true })
  })

  it('rifiuta col motivo: altro ripulito, email a Roberto', async () => {
    const posta = vi.fn(async () => undefined)
    const esito = await rispondi({ accetta: false, motivo: 'altro', altro: '  Ho già un gestionale  ' }, 's1', posta)
    expect(esito).toEqual({ ok: true, scadeIl: null })
    expect(archivio.get('betaInviti/s1')).toMatchObject({
      stato: 'rifiutato', motivoRifiuto: 'altro', altroRifiuto: 'Ho già un gestionale', rispostoIl: ADESSO.toISOString(),
    })
    expect(archivio.get('salons/s1/avvisi/beta')).toMatchObject({ letto: true })
    expect(posta).toHaveBeenCalledTimes(1)
    expect(posta.mock.calls[0][1]).toBe('info@groomlyapp.it')
    expect(archivio.has('salons/s1/pro/main')).toBe(false)
  })

  it('altro ignorato con un altro motivo; motivo assente ammesso; motivo sconosciuto no', async () => {
    await rispondi({ accetta: false, motivo: 'non-serve', altro: 'boh' })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ motivoRifiuto: 'non-serve', altroRifiuto: null })
    invito()
    await rispondi({ accetta: false })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'rifiutato', motivoRifiuto: null })
    invito()
    await expect(rispondi({ accetta: false, motivo: 'caro' })).rejects.toThrow('Risposta non valida: riprova')
    await expect(rispondi({ accetta: false, motivo: 'altro', altro: 'x'.repeat(301) })).rejects.toThrow('Risposta non valida: riprova')
  })
})
