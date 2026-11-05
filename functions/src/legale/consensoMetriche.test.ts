import { describe, expect, it } from 'vitest'
import { VERSIONE_DOCUMENTI, type ConsensoMetriche } from '../../../src/lib/versioneLegale'
import { impostaConsensoMetrichePer, type ArchivioConsenso } from './consensoMetriche'

function memoria(): ArchivioConsenso & { consenso: ConsensoMetriche | null; righe: Record<string, unknown>[] } {
  return {
    consenso: null,
    righe: [],
    async scrivi(_uid, consenso, riga) {
      this.consenso = consenso
      this.righe.push(riga)
    },
  }
}

const ADESSO = new Date('2026-11-05T10:00:00.000Z')

describe('impostaConsensoMetrichePer', () => {
  it('salva scelta, data del server e versione, con riga di registro', async () => {
    const archivio = memoria()
    const esito = await impostaConsensoMetrichePer({ uid: 'u', attivo: true, fonte: 'tour' }, archivio, ADESSO)
    const atteso = { attivo: true, at: ADESSO.toISOString(), fonte: 'tour', versione: VERSIONE_DOCUMENTI }
    expect(esito).toEqual({ ok: true, consenso: atteso })
    expect(archivio.consenso).toEqual(atteso)
    expect(archivio.righe[0]).toEqual({ tipo: 'consenso-metriche', ...atteso })
  })

  it('tiene ogni cambio di idea nel registro', async () => {
    const archivio = memoria()
    await impostaConsensoMetrichePer({ uid: 'u', attivo: true, fonte: 'account' }, archivio, ADESSO)
    await impostaConsensoMetrichePer({ uid: 'u', attivo: false, fonte: 'account' }, archivio, ADESSO)
    expect(archivio.righe).toHaveLength(2)
    expect(archivio.consenso?.attivo).toBe(false)
  })

  it('rifiuta una fonte sconosciuta', async () => {
    const archivio = memoria()
    await expect(impostaConsensoMetrichePer({ uid: 'u', attivo: true, fonte: 'x' }, archivio, ADESSO))
      .rejects.toMatchObject({ code: 'invalid-argument' })
    expect(archivio.consenso).toBeNull()
  })
})
