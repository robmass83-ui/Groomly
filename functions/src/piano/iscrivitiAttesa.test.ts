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

const base: Parameters<typeof iscrivitiAttesaPer>[0] = {
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

  it('l’esca riempita risponde ok senza scrivere niente', async () => {
    const { db, elenco } = salone()
    expect(await iscrivitiAttesaPer({ ...base, esca: 'http://spam' }, db)).toEqual({ ok: true, iscrittoId: '' })
    expect(await iscrivitiAttesaPer({ ...base, esca: '  x ' }, db)).toEqual({ ok: true, iscrittoId: '' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(0)
    expect((await iscrivitiAttesaPer({ ...base, esca: '   ' }, db)).ok).toBe(true)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(1)
  })

  it('lo stesso iscritto attivo (email, cane e servizio) trova il suo id e non scrive un secondo documento', async () => {
    const { db, elenco } = salone()
    const prima = await iscrivitiAttesaPer(base, db)
    const seconda = await iscrivitiAttesaPer({ ...base, email: '  M@Example.COM ', nomeCane: ' Rex ', phone: '+39 333 7654321', servizioIds: ['bagno'] }, db)
    expect(prima.ok && seconda).toEqual({ ok: true, iscrittoId: prima.ok ? prima.iscrittoId : '' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(1)
    // Il nome del cane distingue le maiuscole: «rex» è un altro iscritto.
    expect((await iscrivitiAttesaPer({ ...base, nomeCane: 'rex' }, db)).ok).toBe(true)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
  })

  it('il doppione vale prima del tetto: con due iscrizioni già attive, il ripetersi della prima non è «tante»', async () => {
    const { db, elenco } = salone()
    const prima = await iscrivitiAttesaPer(base, db)
    await iscrivitiAttesaPer({ ...base, nomeCane: 'Luna', phone: '+39 333 1111111' }, db)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
    expect(await iscrivitiAttesaPer(base, db)).toEqual(prima)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
  })

  it('una terza email uguale con un altro cane è «tante»; un iscritto uscito non conta', async () => {
    const { db, elenco, store } = salone()
    await iscrivitiAttesaPer({ ...base, nomeCane: 'A', phone: '+39 333 1000001' }, db)
    await iscrivitiAttesaPer({ ...base, nomeCane: 'B', phone: '+39 333 1000002' }, db)
    expect(await iscrivitiAttesaPer({ ...base, nomeCane: 'C', phone: '+39 333 1000003' }, db)).toEqual({ ok: false, errore: 'tante' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
    const uscito = elenco(`${BASE}/attesa`)[0].id
    store.set(`${BASE}/attesa/${uscito}`, { ...store.get(`${BASE}/attesa/${uscito}`), attivo: false })
    expect((await iscrivitiAttesaPer({ ...base, nomeCane: 'C', phone: '+39 333 1000003' }, db)).ok).toBe(true)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(3)
  })

  it('lo stesso cellulare due volte, poi una terza, è «tante»', async () => {
    const { db, elenco } = salone()
    await iscrivitiAttesaPer({ ...base, email: 'a@example.com', nomeCane: 'A' }, db)
    await iscrivitiAttesaPer({ ...base, email: 'b@example.com', nomeCane: 'B' }, db)
    expect(await iscrivitiAttesaPer({ ...base, email: 'c@example.com', nomeCane: 'C' }, db)).toEqual({ ok: false, errore: 'tante' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
  })

  it('la ventunesima persona attiva è «tante» e non scrive', async () => {
    const { db, elenco } = salone()
    for (let n = 1; n <= 20; n += 1) {
      const esito = await iscrivitiAttesaPer({ ...base, email: `p${n}@example.com`, nomeCane: `Cane${n}`, phone: `+39 333 20000${String(n).padStart(2, '0')}` }, db)
      expect(esito.ok).toBe(true)
    }
    expect(elenco(`${BASE}/attesa`)).toHaveLength(20)
    expect(await iscrivitiAttesaPer({ ...base, email: 'p21@example.com', nomeCane: 'Cane21', phone: '+39 333 2000021' }, db)).toEqual({ ok: false, errore: 'tante' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(20)
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
