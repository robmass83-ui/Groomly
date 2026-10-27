import { describe, expect, it } from 'vitest'
import { silenzioEmailPer, type ArchivioSilenzio } from './silenzioEmail'
import type { RigaCoda } from '../../../src/lib/codaEmail'

const base: RigaCoda = {
  id: '1',
  tipo: 'promemoria',
  dogId: 'd',
  appointmentId: 'a',
  evento: 'promemoria:a:2026-10-28',
  parteIl: '2026-10-27T16:00:00.000Z',
  stato: 'in_coda',
  motivo: '',
  email: 'a@b.it',
  nomeCane: 'Fido',
}

function memoria(input: { salonId: string; token: string; dogId: string; righe: RigaCoda[] }): ArchivioSilenzio & {
  bloccati: string[]
  scritte: RigaCoda[]
} {
  const bloccati: string[] = []
  const scritte: RigaCoda[] = []
  return {
    bloccati,
    scritte,
    async leggiRiga(salonId, token) {
      if (salonId !== input.salonId || token !== input.token) return null
      const riga = input.righe.find((item) => item.dogId === input.dogId)
      return riga ? { dogId: riga.dogId } : null
    },
    async caneEsiste(salonId, dogId) {
      return salonId === input.salonId && dogId === input.dogId
    },
    async segnaBloccata(salonId, dogId) {
      bloccati.push(`${salonId}/${dogId}`)
    },
    async leggiRighe(salonId, dogId) {
      return input.righe.filter((riga) => salonId === input.salonId && riga.dogId === dogId)
    },
    async scriviFermate(_salonId, righe) {
      scritte.push(...righe)
    },
  }
}

describe('silenzio email', () => {
  it('segna il cane e ferma solo le righe in coda', async () => {
    const nonInviata: RigaCoda = { ...base, id: 'n', evento: 'n', stato: 'non_inviata' }
    const altro: RigaCoda = { ...base, id: 'a', dogId: 'altro', evento: 'a' }
    const store = memoria({ salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base, nonInviata, altro] })
    await silenzioEmailPer({ salonId: 's', token: 'a'.repeat(32) }, store)
    expect(store.bloccati).toEqual(['s/d'])
    expect(store.scritte).toEqual([{ ...base, stato: 'fermata', motivo: 'fermata' }])
  })

  it('un token diverso non scrive', async () => {
    const store = memoria({ salonId: 's', token: 'a'.repeat(32), dogId: 'd', righe: [base] })
    await expect(silenzioEmailPer({ salonId: 's', token: 'b'.repeat(32) }, store)).rejects.toThrow()
    expect(store.bloccati).toEqual([])
    expect(store.scritte).toEqual([])
  })
})
