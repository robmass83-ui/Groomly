import { describe, expect, it } from 'vitest'
import { DOCUMENTI_IN_VIGORE, VERSIONE_DOCUMENTI, type TerminiAccount } from '../../../src/lib/versioneLegale'
import { registraAccettazionePer, type ArchivioAccettazione } from './registraAccettazione'

function memoria(): ArchivioAccettazione & { termini: TerminiAccount | null; righe: Map<string, Record<string, unknown>> } {
  const righe = new Map<string, Record<string, unknown>>()
  return {
    termini: null,
    righe,
    async scrivi(_uid, termini, idRiga, riga) {
      this.termini = termini
      righe.set(idRiga, riga)
    },
  }
}

const adesso = new Date('2026-11-05T10:00:00.000Z')

describe('registraAccettazionePer', () => {
  it('rifiuta una versione diversa da quella in vigore', async () => {
    const archivio = memoria()
    await expect(registraAccettazionePer({ uid: 'u', versione: VERSIONE_DOCUMENTI + 1, appVersione: '1' }, archivio, adesso))
      .rejects.toMatchObject({ code: 'invalid-argument' })
    expect(archivio.termini).toBeNull()
  })

  it('scrive la data del server e la riga di registro', async () => {
    const archivio = memoria()
    const esito = await registraAccettazionePer({ uid: 'u', versione: VERSIONE_DOCUMENTI, appVersione: '1.1.192' }, archivio, adesso)
    const termini = { accettati: true, at: adesso.toISOString(), versione: VERSIONE_DOCUMENTI, documenti: DOCUMENTI_IN_VIGORE, suServer: true }
    expect(esito).toEqual({ ok: true, termini })
    expect(archivio.termini).toEqual(termini)
    expect(archivio.righe.get(`documenti-${VERSIONE_DOCUMENTI}`)).toEqual({
      tipo: 'documenti',
      versione: VERSIONE_DOCUMENTI,
      documenti: DOCUMENTI_IN_VIGORE,
      at: adesso.toISOString(),
      appVersione: '1.1.192',
    })
  })

  it('un doppio tocco lascia una sola riga', async () => {
    const archivio = memoria()
    const input = { uid: 'u', versione: VERSIONE_DOCUMENTI, appVersione: '1' }
    await registraAccettazionePer(input, archivio, adesso)
    await registraAccettazionePer(input, archivio, adesso)
    expect(archivio.righe.size).toBe(1)
  })
})
