import { describe, expect, it, vi } from 'vitest'
import { decisioneLimite, dettaglioDa, dettaglioPossibile, suggerimentiDa, suggerimentoPossibile } from './places'

function rispostaFinta(corpo: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => corpo } as Response
}

describe('suggerimentiDa', () => {
  it('chiama autocomplete con chiave, sessione e regione', async () => {
    const predizioni = Array.from({ length: 7 }, (_, i) => ({
      placePrediction: {
        placeId: `p${i}`,
        structuredFormat: { mainText: { text: `Via ${i}` }, secondaryText: { text: 'Quartu' } },
      },
    }))
    const fetchFinto = vi.fn(async () => rispostaFinta({ suggestions: predizioni }))
    const risultato = await suggerimentiDa({
      testo: 'via Renoir 8', sessione: 's', lingua: 'it', chiave: 'k', fetch: fetchFinto as unknown as typeof fetch,
    })
    const [url, init] = fetchFinto.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('places:autocomplete')
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe('k')
    const corpo = JSON.parse(String(init.body))
    expect(corpo).toMatchObject({ input: 'via Renoir 8', sessionToken: 's', languageCode: 'it', regionCode: 'it' })
    expect(risultato).toHaveLength(5)
    expect(risultato[0]).toEqual({ placeId: 'p0', principale: 'Via 0', secondario: 'Quartu' })
  })

  it('non chiama Google con testo corto o chiave assente', async () => {
    const fetchFinto = vi.fn()
    const f = fetchFinto as unknown as typeof fetch
    expect(await suggerimentiDa({ testo: 'vi', sessione: 's', lingua: 'it', chiave: 'k', fetch: f })).toEqual([])
    expect(await suggerimentiDa({ testo: 'via Renoir', sessione: 's', lingua: 'it', chiave: '', fetch: f })).toEqual([])
    expect(fetchFinto).not.toHaveBeenCalled()
  })

  it('con risposta non ok restituisce lista vuota', async () => {
    const f = (async () => rispostaFinta({}, false, 500)) as unknown as typeof fetch
    expect(await suggerimentiDa({ testo: 'via Renoir', sessione: 's', lingua: 'it', chiave: 'k', fetch: f })).toEqual([])
  })
})

describe('dettaglioDa', () => {
  it('chiede solo formattedAddress e restituisce indirizzo e placeId', async () => {
    const fetchFinto = vi.fn(async () => rispostaFinta({ formattedAddress: 'Via Renoir, 8, 09045 Quartu Sant\'Elena CA, Italia' }))
    const risultato = await dettaglioDa({
      placeId: 'abc', sessione: 's', lingua: 'it', chiave: 'k', fetch: fetchFinto as unknown as typeof fetch,
    })
    const [url, init] = fetchFinto.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('places/abc?sessionToken=s')
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).toBe('formattedAddress')
    expect(risultato).toEqual({ indirizzo: 'Via Renoir, 8, 09045 Quartu Sant\'Elena CA, Italia', placeId: 'abc' })
  })

  it('con risposta 404 restituisce null', async () => {
    const f = (async () => rispostaFinta({}, false, 404)) as unknown as typeof fetch
    expect(await dettaglioDa({ placeId: 'abc', sessione: 's', lingua: 'it', chiave: 'k', fetch: f })).toBeNull()
  })
})

describe('decisioneLimite', () => {
  it('parte da 1 senza dati', () => {
    expect(decisioneLimite(undefined, '2026-10-30')).toEqual({ ok: true, prossimo: { giorno: '2026-10-30', conteggio: 1 } })
  })
  it('blocca a 200 nello stesso giorno', () => {
    expect(decisioneLimite({ giorno: '2026-10-30', conteggio: 200 }, '2026-10-30').ok).toBe(false)
    expect(decisioneLimite({ giorno: '2026-10-30', conteggio: 199 }, '2026-10-30')).toEqual({ ok: true, prossimo: { giorno: '2026-10-30', conteggio: 200 } })
  })
  it('riparte da 1 in un giorno nuovo', () => {
    const d = decisioneLimite({ giorno: '2026-10-29', conteggio: 200 }, '2026-10-30')
    expect(d.ok).toBe(true)
    expect(d.prossimo.conteggio).toBe(1)
  })
})

describe('rete irraggiungibile e controlli economici', () => {
  const rifiuta = (async () => { throw new Error('rete') }) as unknown as typeof fetch
  it('fetch che fallisce dà lista vuota e null', async () => {
    expect(await suggerimentiDa({ testo: 'via Renoir', sessione: 's', lingua: 'it', chiave: 'k', fetch: rifiuta })).toEqual([])
    expect(await dettaglioDa({ placeId: 'abc', sessione: 's', lingua: 'it', chiave: 'k', fetch: rifiuta })).toBeNull()
  })
  it('passa un segnale di timeout a Google', async () => {
    const f = vi.fn(async () => rispostaFinta({ suggestions: [] }))
    await suggerimentiDa({ testo: 'via Renoir', sessione: 's', lingua: 'it', chiave: 'k', fetch: f as unknown as typeof fetch })
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBeInstanceOf(AbortSignal)
  })
  it('i controlli prima del limite rifiutano testo corto, placeId vuoto e chiave assente', () => {
    expect(suggerimentoPossibile('vi', 'k')).toBe(false)
    expect(suggerimentoPossibile('via Renoir', '')).toBe(false)
    expect(suggerimentoPossibile('via Renoir', 'k')).toBe(true)
    expect(dettaglioPossibile('', 'k')).toBe(false)
    expect(dettaglioPossibile('abc', '')).toBe(false)
    expect(dettaglioPossibile('abc', 'k')).toBe(true)
  })
})
