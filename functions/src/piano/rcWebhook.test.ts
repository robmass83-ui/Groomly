import { describe, expect, it } from 'vitest'
import { applicaWebhook, type MemoriaEventi } from './rcWebhook'

function memoria(): MemoriaEventi & { ids: string[] } {
  const ids: string[] = []
  return {
    ids,
    ha: (id) => ids.includes(id),
    aggiungi: (id) => { ids.push(id) },
  }
}

const SEGRETO = `Bearer ${'k7'.repeat(20)}`

describe('webhook RevenueCat', () => {
  it('senza chiave risponde 503, senza header 401, e non riscrive un evento già visto', () => {
    const store = memoria()
    expect(applicaWebhook({ authorization: SEGRETO, atteso: SEGRETO, eventoId: 'e1', apiKey: '' }, store).status).toBe(503)
    expect(store.ids).toEqual([])
    expect(applicaWebhook({ authorization: undefined, atteso: SEGRETO, eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(401)
    expect(applicaWebhook({ authorization: `${SEGRETO}x`, atteso: SEGRETO, eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(401)
    expect(applicaWebhook({ authorization: SEGRETO, atteso: SEGRETO, eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(200)
    expect(applicaWebhook({ authorization: SEGRETO, atteso: SEGRETO, eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(200)
    expect(store.ids).toEqual(['e1'])
  })

  it('con un segreto corto il webhook resta chiuso, anche con l’header uguale', () => {
    const store = memoria()
    for (const corto of ['Bearer ok', 'provvisorio', '']) {
      expect(applicaWebhook({ authorization: corto, atteso: corto, eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(503)
    }
    expect(store.ids).toEqual([])
  })
})
