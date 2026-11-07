import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const letture = vi.hoisted(() => ({ firestore: 0 }))

vi.mock('./gatePrenotazione', () => ({ salonPrenota: vi.fn(async () => true) }))
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'ORA_DEL_SERVER' },
  getFirestore: () => {
    letture.firestore += 1
    throw new Error('Firestore non va toccato')
  },
}))

const { inviaRichiestaPer } = await import('./inviaRichiesta')

const base = {
  salonId: 'salone-prova',
  email: 'ada@cliente.it',
  phone: '320 5550000',
  nome: 'Ada Rossi',
  inizio: '2026-11-14T10:30:00',
  fine: '2026-11-14T10:30:00',
  esca: '',
  consenso: true,
  giorno: '2026-11-14',
  ora: '10:30',
  taglia: 'media',
  specie: 'cane',
  razza: 'Meticcio',
  servizi: ['bagno'],
}

describe('inviaRichiesta: prezzo indicativo accettato', () => {
  beforeEach(() => { letture.firestore = 0 })

  it('senza la spunta la richiesta è rifiutata dal server, anche forzando la chiamata', async () => {
    await expect(inviaRichiestaPer(base)).rejects.toMatchObject({ code: 'invalid-argument', details: { codice: 'prezzo_non_accettato' } })
    await expect(inviaRichiestaPer({ ...base, prezzoIndicativoAccettato: false })).rejects.toMatchObject({ details: { codice: 'prezzo_non_accettato' } })
    expect(letture.firestore).toBe(0)
  })

  it('con la spunta passa il controllo e prosegue verso Firestore', async () => {
    await expect(inviaRichiestaPer({ ...base, prezzoIndicativoAccettato: true })).rejects.toThrow('Firestore non va toccato')
    expect(letture.firestore).toBe(1)
  })

  it('salva accettazione, ora del server e prezzo stimato calcolato dal listino del salone', () => {
    const funzione = readFileSync('functions/src/piano/inviaRichiesta.ts', 'utf8')
    expect(funzione).toContain('prezzoIndicativoAccettato: true,')
    expect(funzione).toContain('prezzoIndicativoAccettatoAt: FieldValue.serverTimestamp(),')
    expect(funzione).toContain('prezzoStimato: scelta.totaleIndicativo,')
    const index = readFileSync('functions/src/index.ts', 'utf8')
    expect(index.slice(index.indexOf('export const inviaRichiesta'), index.indexOf('function chiaveBrevo')))
      .toContain("prezzoIndicativoAccettato: field(request.data, 'prezzoIndicativoAccettato') === true")
  })
})
