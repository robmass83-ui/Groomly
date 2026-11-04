import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PianoRichiesta, RichiestaDoc } from '../../../src/lib/pianoRichiesta'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { applicaPiano, inviaMailRichiesta } from './gestisciPrenotazione'

const base = 'salons/s1'
const adesso = new Date('2026-10-28T08:00:00.000Z')

const richiesta: RichiestaDoc = {
  status: 'nuova', token: 't', nome: 'Ada', phone: '333', email: 'a@b.it', cane: 'Fido', razza: 'Yorkshire',
  specie: 'cane', taglia: 'piccola', foto: [], start: '2026-10-29T09:00:00.000Z', end: '2026-10-29T10:00:00.000Z',
  sceltaAnimale: 'nuovo',
  voci: [{ id: 'bagno', nome: 'Bagno', kind: 'principale', minuti: 60, prezzo: 99 }],
}

function piano(parti: Partial<PianoRichiesta>): PianoRichiesta {
  return { ok: true, richiesta: { status: 'accettata' }, appuntamento: 'crea', cane: 'crea', ...parti } as PianoRichiesta
}

function prezzoSalvato(chiave: string): unknown {
  return (archivio.get(chiave)?.services as { price: number }[])[0].price
}

describe('applicaPiano: lingua del cliente sulla scheda', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set(`${base}/richieste/r1`, { ...richiesta })
  })

  it('una scheda nuova nasce con la lingua della richiesta', async () => {
    const esito = await applicaPiano({ salonId: 's1', id: 'r1', richiesta: { ...richiesta, lingua: 'de' }, piano: piano({}), adesso })
    expect(esito.ok && archivio.get(`${base}/dogs/${esito.dogId}`)?.lingua).toBe('de')
  })

  it('su una scheda esistente si scrive solo se manca', async () => {
    const scelta = { ...richiesta, sceltaAnimale: 'd1', lingua: 'fr' as const }
    archivio.set(`${base}/dogs/d1`, { name: 'Fido', status: 'attivo' })
    await applicaPiano({ salonId: 's1', id: 'r1', richiesta: scelta, piano: piano({ cane: 'niente' }), adesso })
    expect(archivio.get(`${base}/dogs/d1`)?.lingua).toBe('fr')
    archivio.set(`${base}/richieste/r1`, { ...richiesta })
    archivio.set(`${base}/dogs/d1`, { name: 'Fido', status: 'attivo', lingua: 'es' })
    await applicaPiano({ salonId: 's1', id: 'r1', richiesta: scelta, piano: piano({ cane: 'niente' }), adesso })
    expect(archivio.get(`${base}/dogs/d1`)?.lingua).toBe('es')
  })
})

describe('applicaPiano: prezzi dal listino per razza', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set(`${base}/richieste/r1`, { ...richiesta })
    archivio.set(`${base}/services/bagno`, { name: 'Bagno', active: true, price: { piccola: 20, media: 30, grande: 40 } })
    archivio.set(`${base}/settings/main`, {
      priceSheet: { razze: [{ nome: 'Yorkshire', voci: [{ nome: 'Bagno', prezzo: 35, servizioId: 'bagno' }] }] },
    })
  })

  it('cane nuovo: la visita creata prende il prezzo del listino', async () => {
    const esito = await applicaPiano({ salonId: 's1', id: 'r1', richiesta, piano: piano({}), adesso })
    expect(esito.ok).toBe(true)
    if (esito.ok) expect(prezzoSalvato(`${base}/appointments/${esito.appointmentId}`)).toBe(35)
  })

  it('cane esistente con prezzo personale: vince il prezzo personale', async () => {
    archivio.set(`${base}/dogs/d1`, { breed: 'Yorkshire', size: 'piccola', servicePrices: [{ serviceId: 'bagno', price: 28 }] })
    const esito = await applicaPiano({
      salonId: 's1', id: 'r1', richiesta: { ...richiesta, sceltaAnimale: 'd1' },
      piano: piano({ cane: 'niente' }), adesso,
    })
    expect(esito.ok).toBe(true)
    if (esito.ok) expect(prezzoSalvato(`${base}/appointments/${esito.appointmentId}`)).toBe(28)
  })

  it('conferma che sostituisce il segnaposto: prezzo del listino', async () => {
    const proposta = { ...richiesta, status: 'proposta' as const, appointmentId: 'a1' }
    archivio.set(`${base}/richieste/r1`, { ...proposta })
    archivio.set(`${base}/appointments/a1`, { id: 'a1', services: [{ serviceId: 'prenotazione', name: 'Prenotazione', durationMin: 60, price: 0 }] })
    const esito = await applicaPiano({
      salonId: 's1', id: 'r1', richiesta: proposta,
      piano: piano({ appuntamento: 'conferma', richiesta: { status: 'accettata' } }), adesso,
    })
    expect(esito.ok).toBe(true)
    expect(prezzoSalvato(`${base}/appointments/a1`)).toBe(35)
  })
})

describe('inviaMailRichiesta: la catena della lingua', () => {
  async function oggetto(propria: { lingua?: 'de' }, tipo: 'conferma' | 'scadenza' = 'conferma'): Promise<{ subject: string; htmlContent: string }> {
    const posta = vi.fn(async () => new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', posta)
    const inviata = await inviaMailRichiesta({ apiKey: 'x', salonId: 's1', tipo, richiesta: { ...richiesta, ...propria } })
    vi.unstubAllGlobals()
    expect(inviata).toBe(true)
    return JSON.parse(String((posta.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { subject: string; htmlContent: string }
  }

  beforeEach(() => {
    archivio.clear()
    // Il titolare ha l'app in inglese: la sua lingua non deve entrare nelle email ai clienti.
    archivio.set('accounts/s1', { email: 'sala@salone.it', lingua: 'en' })
  })

  it('prima la lingua della richiesta', async () => {
    archivio.set(`${base}/settings/main`, { linguaClienti: 'es' })
    expect((await oggetto({ lingua: 'de' })).subject).toBe('Termin für Fido bestätigt')
    expect((await oggetto({ lingua: 'de' }, 'scadenza')).subject).toBe('Ihre Anfrage ist abgelaufen')
  })

  it('poi la lingua dei clienti del salone', async () => {
    archivio.set(`${base}/settings/main`, { linguaClienti: 'es' })
    expect((await oggetto({})).subject).toBe('Cita confirmada para Fido')
  })

  it('poi l’italiano, mai la lingua del titolare', async () => {
    archivio.set(`${base}/settings/main`, {})
    expect((await oggetto({})).subject).toBe('Appuntamento confermato per Fido')
  })

  it('i link portano la lingua dell’email', async () => {
    const posta = vi.fn(async () => new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', posta)
    await inviaMailRichiesta({ apiKey: 'x', salonId: 's1', tipo: 'proposta', richiesta: { ...richiesta, lingua: 'de' }, url: 'https://x.it/r?azione=conferma', urlRifiuta: 'https://x.it/r?azione=rifiuta', inizio: richiesta.start, fine: richiesta.end, scadeIl: richiesta.end })
    vi.unstubAllGlobals()
    const corpo = JSON.parse(String((posta.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { htmlContent: string }
    expect(corpo.htmlContent.replaceAll('&amp;', '&')).toContain('https://x.it/r?azione=conferma&lang=de')
    expect(corpo.htmlContent.replaceAll('&amp;', '&')).toContain('https://x.it/r?azione=rifiuta&lang=de')
  })
})
