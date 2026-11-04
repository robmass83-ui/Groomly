import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { giorniAllaFine, mandaAvvisiFineBeta, prossimoAvviso } from './avvisiFineBeta'
import { scadiInvitiBetaScaduti } from './scadiInvitiBeta'

const ADESSO = new Date('2026-11-04T08:00:00.000Z') // le 9 a Roma
const iso = (giorni: number) => new Date(ADESSO.getTime() + giorni * 86_400_000).toISOString()

function invito(id: string, stato: string, over: Record<string, unknown> = {}) {
  archivio.set(`betaInviti/${id}`, {
    salonId: id, piano: 'pro', giorni: 30, messaggio: null, stato, invitatoIl: iso(-20), scadeInvitoIl: iso(-6),
    rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: 'r', aggiornatoIl: 'x', ...over,
  })
}

function beta(id: string, fineGiorni: number, dalGiorni = -10) {
  archivio.set(`salons/${id}/pro/main`, {
    piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: iso(fineGiorni),
    exBeta: true, betaPiano: 'pro', betaDal: iso(dalGiorni), betaFinoAl: iso(fineGiorni), earlyAdopter: true,
  })
}

describe('scadiInvitiBetaScaduti', () => {
  beforeEach(() => archivio.clear())

  it('segna scaduti solo gli inviti aperti oltre la scadenza e spegne l’avviso dell’invito', async () => {
    invito('vecchio', 'invitato')
    invito('nuovo', 'invitato', { scadeInvitoIl: iso(3) })
    invito('accettato', 'accettato')
    archivio.set('salons/vecchio/avvisi/beta', { tipo: 'invito', letto: false })
    expect(await scadiInvitiBetaScaduti(ADESSO)).toBe(1)
    expect(archivio.get('betaInviti/vecchio')).toMatchObject({ stato: 'scaduto', aggiornatoIl: ADESSO.toISOString() })
    expect(archivio.get('betaInviti/nuovo')).toMatchObject({ stato: 'invitato' })
    expect(archivio.get('betaInviti/accettato')).toMatchObject({ stato: 'accettato' })
    expect(archivio.get('salons/vecchio/avvisi/beta')).toMatchObject({ letto: true })
  })
})

describe('giorniAllaFine', () => {
  it('conta i giorni di calendario a Roma', () => {
    expect(giorniAllaFine('2026-11-05T22:30:00.000Z', ADESSO)).toBe(1) // 23:30 del 5 a Roma
    expect(giorniAllaFine('2026-11-05T23:30:00.000Z', ADESSO)).toBe(2) // 00:30 del 6 a Roma
    expect(giorniAllaFine('2026-11-04T22:59:00.000Z', ADESSO)).toBe(0)
    expect(giorniAllaFine('2026-11-11T08:00:00.000Z', ADESSO)).toBe(7)
  })
})

describe('prossimoAvviso', () => {
  const pro = (fine: number, dal = -10, extra: Record<string, unknown> = {}) => ({
    piano: 'pro' as const, stato: 'attivo' as const, fonte: 'beta' as const, scadeIl: iso(fine),
    exBeta: true, betaPiano: 'pro' as const, betaDal: iso(dal), betaFinoAl: iso(fine), ...extra,
  })

  it('feedback dopo 7 giorni, poi fine-7, poi fine-1, una volta sola ciascuno', () => {
    expect(prossimoAvviso({}, pro(30, -6), ADESSO)).toBeNull()
    expect(prossimoAvviso({}, pro(30, -7), ADESSO)).toBe('feedback')
    expect(prossimoAvviso({ feedback: 'x' }, pro(30), ADESSO)).toBeNull()
    expect(prossimoAvviso({ feedback: 'x' }, pro(7), ADESSO)).toBe('fine-7')
    expect(prossimoAvviso({}, pro(7, -2), ADESSO)).toBe('fine-7')
    expect(prossimoAvviso({ 'fine-7': iso(7) }, pro(7), ADESSO)).toBeNull()
    expect(prossimoAvviso({ 'fine-7': iso(1) }, pro(1), ADESSO)).toBe('fine-1')
    expect(prossimoAvviso({}, pro(1), ADESSO)).toBe('fine-1')
    expect(prossimoAvviso({ 'fine-1': iso(1) }, pro(1), ADESSO)).toBeNull()
  })

  it('dopo un’estensione il fine-7 riparte sulla nuova fine', () => {
    expect(prossimoAvviso({ feedback: 'x', 'fine-7': iso(5) }, pro(7, -10, { betaFinoAl: iso(7) }), ADESSO)).toBe('fine-7')
  })

  it('beta chiusa: finita una volta; con un altro piano niente', () => {
    const chiusa = { piano: 'base' as const, stato: 'scaduto' as const, fonte: null, exBeta: true, betaPiano: 'pro' as const, betaDal: iso(-31), betaFinoAl: iso(-1) }
    expect(prossimoAvviso({}, chiusa, ADESSO)).toBe('finita')
    expect(prossimoAvviso({ finita: iso(-1) }, chiusa, ADESSO)).toBeNull()
    expect(prossimoAvviso({}, { ...chiusa, piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: iso(30) }, ADESSO)).toBeNull()
    expect(prossimoAvviso({}, undefined, ADESSO)).toBeNull()
  })
})

describe('mandaAvvisiFineBeta', () => {
  beforeEach(() => {
    archivio.clear()
    for (const id of ['f7', 'f1', 'fb', 'fin', 'riv']) archivio.set(`accounts/${id}`, { salonId: id, role: 'titolare', email: `${id}@x.it`, lingua: 'it' })
  })

  it('scrive avvisi e segni, email solo per fine-7 e fine-1, niente per i revocati; il secondo giro non ripete', async () => {
    invito('f7', 'accettato'); beta('f7', 6)
    invito('f1', 'accettato'); beta('f1', 1)
    invito('fb', 'accettato'); beta('fb', 20, -8)
    invito('fin', 'accettato')
    archivio.set('salons/fin/pro/main', { piano: 'base', stato: 'scaduto', fonte: null, exBeta: true, betaPiano: 'pro', betaDal: iso(-31), betaFinoAl: iso(-1) })
    invito('riv', 'revocato'); beta('riv', 6)
    const posta = vi.fn(async () => undefined)
    expect(await mandaAvvisiFineBeta({ adesso: ADESSO, apiKey: 'k', posta })).toBe(4)
    expect(archivio.get('salons/f7/avvisi/beta')).toMatchObject({ tipo: 'fine-7', piano: 'pro', scadeIl: iso(6), letto: false })
    expect(archivio.get('salons/f1/avvisi/beta')).toMatchObject({ tipo: 'fine-1' })
    expect(archivio.get('salons/fb/avvisi/beta')).toMatchObject({ tipo: 'feedback', scadeIl: iso(20) })
    expect(archivio.get('salons/fin/avvisi/beta')).toMatchObject({ tipo: 'finita', scadeIl: iso(-1) })
    expect(archivio.has('salons/riv/avvisi/beta')).toBe(false)
    expect(archivio.get('betaInviti/f1')?.promemoria).toEqual({ 'fine-1': iso(1), 'fine-7': iso(1), feedback: ADESSO.toISOString() })
    expect(posta.mock.calls.map((c) => c[1]).sort()).toEqual(['f1@x.it', 'f7@x.it'])
    expect(await mandaAvvisiFineBeta({ adesso: ADESSO, apiKey: 'k', posta })).toBe(0)
    expect(posta).toHaveBeenCalledTimes(2)
  })
})
