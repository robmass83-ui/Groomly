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

describe('webhook RevenueCat', () => {
  it('senza chiave risponde 503, senza header 401, e non riscrive un evento già visto', () => {
    const store = memoria()
    expect(applicaWebhook({ authorization: 'Bearer ok', atteso: 'Bearer ok', eventoId: 'e1', apiKey: '' }, store).status).toBe(503)
    expect(store.ids).toEqual([])
    expect(applicaWebhook({ authorization: undefined, atteso: 'Bearer ok', eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(401)
    expect(applicaWebhook({ authorization: 'Bearer ok', atteso: 'Bearer ok', eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(200)
    expect(applicaWebhook({ authorization: 'Bearer ok', atteso: 'Bearer ok', eventoId: 'e1', apiKey: 'chiave' }, store).status).toBe(200)
    expect(store.ids).toEqual(['e1'])
  })
})
