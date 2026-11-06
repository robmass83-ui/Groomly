import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { giraInvioCoda } from './giraCoda'

const ADESSO = new Date('2026-11-05T10:00:00.000Z')
const GIORNO = '2026-11-05'

function riga(id: string, email = `${id}@cliente.it`) {
  return {
    id,
    tipo: 'pronto',
    dogId: 'd1',
    appointmentId: 'a1',
    evento: `pronto:${id}`,
    parteIl: '2026-11-05T09:00:00.000Z',
    stato: 'in_coda',
    motivo: '',
    email,
    nomeCane: 'Rex',
    nomeCliente: 'Ada',
    inizio: null,
  }
}

function salone(id: string, righe: unknown[]) {
  archivio.set(`salons/${id}/settings/main`, { serviziEmail: { pronto: { modo: 'automatico' } }, codaEmail: righe })
  archivio.set(`salons/${id}/pro/main`, { piano: 'pro', stato: 'attivo' })
  archivio.set(`salons/${id}/dogs/d1`, { name: 'Rex', status: 'attivo', contact: { name: 'Ada', email: 'ada@cliente.it' } })
}

function brevo(ok = true) {
  return vi.fn(async () => new Response('{}', { status: ok ? 201 : 500 }))
}

describe('il giro delle email', () => {
  beforeEach(() => archivio.clear())

  it('spedisce, conta prima di spedire e lascia libero il giro dopo', async () => {
    salone('s1', [riga('pronto:r1')])
    const fetchImpl = brevo()
    const esito = await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: fetchImpl as typeof fetch })
    expect(esito).toEqual({ saloni: 1, inviate: 1 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(archivio.get('sistema/postaGiorno')).toMatchObject({ n: 1, perSalone: { s1: 1 } })
    expect(archivio.get('sistema/giroCoda')).toMatchObject({ fino: 0 })
  })

  it('un giro già in corso fa saltare quello nuovo', async () => {
    salone('s1', [riga('pronto:r1')])
    archivio.set('sistema/giroCoda', { fino: Date.now() + 60_000 })
    const fetchImpl = brevo()
    expect(await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: fetchImpl as typeof fetch })).toEqual({ saloni: 0, inviate: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('un giro interrotto da tempo non blocca i successivi', async () => {
    salone('s1', [riga('pronto:r1')])
    archivio.set('sistema/giroCoda', { fino: Date.now() - 1 })
    const esito = await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: brevo() as typeof fetch })
    expect(esito.inviate).toBe(1)
  })

  it('al tetto non parte nulla, anche se il conto del salone arriva da un altro giro', async () => {
    salone('s1', [riga('pronto:r1')])
    archivio.set('sistema/postaGiorno', { giorno: GIORNO, n: 300, perSalone: { s1: 300 }, accesi: ['s1'] })
    const fetchImpl = brevo()
    await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: fetchImpl as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('un’email rifiutata da Brevo restituisce il posto', async () => {
    salone('s1', [riga('pronto:r1')])
    await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: brevo(false) as typeof fetch })
    expect(archivio.get('sistema/postaGiorno')).toMatchObject({ n: 0 })
  })

  it('una riga con id riservato non parte e non ferma le altre', async () => {
    salone('s1', [riga('__x__'), riga('pronto:r1')])
    const fetchImpl = brevo()
    const esito = await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: fetchImpl as typeof fetch })
    expect(esito.inviate).toBe(1)
  })

  it('una riga già chiusa nel registro non si riapre da settings, come dopo un ripristino', async () => {
    salone('s1', [riga('pronto:r1')])
    archivio.set('salons/s1/coda/pronto:r1', { ...riga('pronto:r1'), stato: 'inviata' })
    const fetchImpl = brevo()
    await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: fetchImpl as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('una riga di un cane che non c’è più si chiude senza partire', async () => {
    salone('s1', [{ ...riga('pronto:r1'), dogId: 'cancellato' }])
    const fetchImpl = brevo()
    await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: fetchImpl as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(archivio.get('salons/s1/settings/main')?.codaEmail).toMatchObject([{ stato: 'chiusa' }])
  })

  it('un salone che fallisce non ferma gli altri', async () => {
    salone('s1', [riga('pronto:r1')])
    salone('s2', [riga('pronto:r2')])
    const esito = await giraInvioCoda({ apiKey: 'k', adesso: ADESSO, fetchImpl: brevo() as typeof fetch })
    expect(esito).toEqual({ saloni: 2, inviate: 2 })
  })
})
