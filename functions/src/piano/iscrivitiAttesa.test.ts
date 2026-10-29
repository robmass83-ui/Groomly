import type { Firestore } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { iscrivitiAttesaPer } from './iscrivitiAttesa'

// Un Firestore in memoria con quanto serve all'iscrizione: documenti, collezioni e id automatici.
type Dati = Record<string, unknown>

function memoria(iniziale: Record<string, Dati>) {
  const store = new Map<string, Dati>(Object.entries(iniziale))
  let contatore = 0
  const figli = (path: string) => [...store.keys()].filter((chiave) => chiave.startsWith(`${path}/`) && !chiave.slice(path.length + 1).includes('/'))
  const snap = (path: string) => {
    const dati = store.get(path)
    return { id: path.split('/').pop() as string, exists: dati !== undefined, data: () => (dati ? structuredClone(dati) : undefined) }
  }
  const ref = (path: string) => ({
    path,
    id: path.split('/').pop() as string,
    get: async () => snap(path),
    set: async (dati: Dati) => { store.set(path, structuredClone(dati)) },
  })
  const db = {
    doc: (path: string) => ref(path),
    collection: (path: string) => ({
      doc: (id?: string) => ref(`${path}/${id ?? `auto${++contatore}`}`),
      add: async (dati: Dati) => {
        const nuovo = ref(`${path}/auto${++contatore}`)
        await nuovo.set(dati)
        return nuovo
      },
      get: async () => ({ docs: figli(path).map((chiave) => snap(chiave)) }),
    }),
  }
  const elenco = (path: string) => figli(path).map((chiave) => ({ id: chiave.slice(path.length + 1), ...store.get(chiave) as Dati }))
  return { db: db as unknown as Firestore, store, elenco }
}

const ADESSO = new Date('2026-11-04T08:00:00.000Z')
const BASE = 'salons/s1'

function salone(modo = 'manuale', senzaServizi = false) {
  return memoria({
    [`${BASE}/settings/main`]: { serviziEmail: { attesa: { modo } } },
    ...(senzaServizi ? {} : {
      [`${BASE}/services/bagno`]: { name: 'Bagno', kind: 'principale', order: 1, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
      [`${BASE}/services/unghie`]: { name: 'Unghie', kind: 'extra', order: 2, durationMin: { piccola: 10, media: 10, grande: 15 }, price: { piccola: 5, media: 5, grande: 7 } },
    }),
  })
}

const base = {
  salonId: 's1',
  nome: 'Mario',
  phone: '+39 333 1234567',
  email: 'm@example.com',
  nomeCane: 'Rex',
  specie: 'cane' as const,
  taglia: 'media' as const,
  servizioIds: ['bagno', 'unghie'],
  consenso: true,
  adesso: ADESSO,
}

describe('iscrivitiAttesaPer', () => {
  it('servizio spento: errore spento e la collezione attesa resta vuota', async () => {
    const { db, elenco } = salone('spento')
    expect(await iscrivitiAttesaPer(base, db)).toEqual({ ok: false, errore: 'spento' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(0)
  })

  it('servizio spento vince anche sul catalogo: nessun servizio nel listino, ma l’errore resta spento', async () => {
    const { db, elenco } = salone('spento', true)
    expect(await iscrivitiAttesaPer(base, db)).toEqual({ ok: false, errore: 'spento' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(0)
  })

  it('senza consenso non scrive niente', async () => {
    const { db, elenco } = salone()
    expect(await iscrivitiAttesaPer({ ...base, consenso: false }, db)).toEqual({ ok: false, errore: 'consenso' })
    expect(await iscrivitiAttesaPer({ ...base, consenso: undefined as unknown as boolean }, db)).toEqual({ ok: false, errore: 'consenso' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(0)
  })

  it('un’iscrizione valida scrive un documento con la durata del listino e attivo true', async () => {
    const { db, elenco } = salone()
    const esito = await iscrivitiAttesaPer(base, db)
    expect(esito.ok).toBe(true)
    const righe = elenco(`${BASE}/attesa`)
    expect(righe).toHaveLength(1)
    expect(esito).toEqual({ ok: true, iscrittoId: righe[0].id })
    expect(righe[0]).toEqual({
      id: righe[0].id,
      attivo: true,
      nome: 'Mario',
      phone: '+39 333 1234567',
      email: 'm@example.com',
      nomeCane: 'Rex',
      specie: 'cane',
      taglia: 'media',
      servizioId: 'bagno',
      trattamento: 'Bagno',
      durataMin: 55,
      creatoIl: '2026-11-04T08:00:00.000Z',
    })
  })

  it('non crea offerte, visite, cani né altro: solo il documento della lista', async () => {
    const { db, store } = salone()
    const prima = [...store.keys()]
    await iscrivitiAttesaPer(base, db)
    const nuovi = [...store.keys()].filter((chiave) => !prima.includes(chiave))
    expect(nuovi).toHaveLength(1)
    expect(nuovi[0].startsWith(`${BASE}/attesa/`)).toBe(true)
  })

  it('dati sbagliati non scrivono: servizio che non c’è, due principali, campo vuoto, salone shared o con barra', async () => {
    const { db, elenco, store } = salone()
    expect(await iscrivitiAttesaPer({ ...base, servizioIds: ['manca'] }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(await iscrivitiAttesaPer({ ...base, servizioIds: ['unghie'] }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(await iscrivitiAttesaPer({ ...base, servizioIds: [] }, db)).toEqual({ ok: false, errore: 'dati' })
    for (const campo of ['nome', 'phone', 'email', 'nomeCane'] as const) {
      expect(await iscrivitiAttesaPer({ ...base, [campo]: '   ' }, db)).toEqual({ ok: false, errore: 'dati' })
    }
    expect(await iscrivitiAttesaPer({ ...base, email: 'non-una-email' }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(await iscrivitiAttesaPer({ ...base, specie: 'drago' as never }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(await iscrivitiAttesaPer({ ...base, taglia: 'enorme' as never }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(await iscrivitiAttesaPer({ ...base, salonId: 'shared' }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(await iscrivitiAttesaPer({ ...base, salonId: 'a/b' }, db)).toEqual({ ok: false, errore: 'dati' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(0)
    expect([...store.keys()].some((chiave) => chiave.includes('/attesa/'))).toBe(false)
  })
})
