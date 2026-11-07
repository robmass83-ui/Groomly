import { FieldValue, type Firestore } from 'firebase-admin/firestore'
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
    return {
      id: path.split('/').pop() as string,
      exists: dati !== undefined,
      data: () => (dati ? structuredClone(dati) : undefined),
      get: (campo: string) => (dati ? structuredClone(dati[campo]) : undefined),
    }
  }
  const ref = (path: string) => ({
    path,
    id: path.split('/').pop() as string,
    get: async () => snap(path),
    set: async (dati: Dati) => { store.set(path, structuredClone(dati)) },
    update: async (dati: Dati) => {
      const attuale = structuredClone(store.get(path) ?? {})
      for (const [chiave, valore] of Object.entries(dati)) {
        if (valore instanceof FieldValue && valore.isEqual(FieldValue.delete())) delete attuale[chiave]
        else attuale[chiave] = structuredClone(valore)
      }
      store.set(path, attuale)
    },
  })
  const db = {
    doc: (path: string) => ref(path),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({
      get: (r: { path: string }) => Promise.resolve(snap(r.path)),
      set: (r: { path: string }, dati: Dati) => { store.set(r.path, structuredClone(dati)) },
    }),
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

function salone(modo = 'manuale', senzaServizi = false, pro: Dati | null = { piano: 'pro', stato: 'attivo' }) {
  return memoria({
    [`${BASE}/settings/main`]: { serviziEmail: { attesa: { modo } } },
    ...(pro ? { [`${BASE}/pro/main`]: pro } : {}),
    ...(senzaServizi ? {} : {
      [`${BASE}/services/bagno`]: { name: 'Bagno', kind: 'principale', order: 1, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
      [`${BASE}/services/unghie`]: { name: 'Unghie', kind: 'extra', order: 2, durationMin: { piccola: 10, media: 10, grande: 15 }, price: { piccola: 5, media: 5, grande: 7 } },
    }),
  })
}

const baseIniziale: Parameters<typeof iscrivitiAttesaPer>[0] = {
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
const base = baseIniziale
// Le prove di chi si riscrive arrivano dalla stessa connessione dell’iscrizione.
const stesso = { ...baseIniziale, mittente: 'conn-cliente' }

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

  it('senza un piano con la lista l’iscrizione è spenta e non scrive nulla', async () => {
    const senza = salone('manuale', false, null)
    expect(await iscrivitiAttesaPer(base, senza.db)).toEqual({ ok: false, errore: 'spento' })
    expect(senza.elenco(`${BASE}/attesa`)).toHaveLength(0)
    const finita = salone('manuale', false, { piano: 'pro', stato: 'prova', scadeIl: '2026-10-01T00:00:00.000Z' })
    expect(await iscrivitiAttesaPer(base, finita.db)).toEqual({ ok: false, errore: 'spento' })
    expect(finita.elenco(`${BASE}/attesa`)).toHaveLength(0)
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

  it('salva la lingua della pagina, ignora un valore sconosciuto e chi si riscrive la aggiorna', async () => {
    const { db, elenco } = salone()
    await iscrivitiAttesaPer({ ...stesso, lingua: 'de' }, db)
    expect(elenco(`${BASE}/attesa`)[0].lingua).toBe('de')
    await iscrivitiAttesaPer({ ...stesso, lingua: 'fr' }, db)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(1)
    expect(elenco(`${BASE}/attesa`)[0].lingua).toBe('fr')
    await iscrivitiAttesaPer({ ...stesso, lingua: 'pt' }, db)
    expect(elenco(`${BASE}/attesa`)[0].lingua).toBe('fr')
    const altro = salone()
    await iscrivitiAttesaPer({ ...stesso, lingua: 'pt' }, altro.db)
    expect(altro.elenco(`${BASE}/attesa`)[0]).not.toHaveProperty('lingua')
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
    const prima = await iscrivitiAttesaPer(stesso, db)
    const seconda = await iscrivitiAttesaPer({ ...stesso, email: '  M@Example.COM ', nomeCane: ' Rex ', phone: '+39 333 7654321', servizioIds: ['bagno'] }, db)
    expect(prima.ok && seconda).toEqual({ ok: true, iscrittoId: prima.ok ? prima.iscrittoId : '' })
    expect(elenco(`${BASE}/attesa`)).toHaveLength(1)
    // Il nome del cane distingue le maiuscole: «rex» è un altro iscritto.
    expect((await iscrivitiAttesaPer({ ...stesso, nomeCane: 'rex' }, db)).ok).toBe(true)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
  })

  it('il doppione vale prima del tetto: con due iscrizioni già attive, il ripetersi della prima non è «tante»', async () => {
    const { db, elenco } = salone()
    const prima = await iscrivitiAttesaPer(stesso, db)
    await iscrivitiAttesaPer({ ...stesso, nomeCane: 'Luna', phone: '+39 333 1111111' }, db)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(2)
    expect(await iscrivitiAttesaPer(stesso, db)).toEqual(prima)
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

describe('iscrivitiAttesaPer con la settimana', () => {
  it('una settimana valida finisce sul documento', async () => {
    const { db, elenco } = salone()
    const settimana = { inizio: '2026-11-16', fine: '2026-11-22' }
    expect((await iscrivitiAttesaPer({ ...base, settimana }, db)).ok).toBe(true)
    expect(elenco(`${BASE}/attesa`)[0].settimana).toEqual(settimana)
  })

  it('una settimana non valida o assente non blocca e non si salva', async () => {
    for (const settimana of ['x', undefined]) {
      const { db, elenco } = salone()
      expect((await iscrivitiAttesaPer({ ...base, settimana }, db)).ok).toBe(true)
      expect(elenco(`${BASE}/attesa`)[0]).not.toHaveProperty('settimana')
    }
  })
})

describe('iscrivitiAttesaPer: riscriversi aggiorna la settimana', () => {
  const prima = { inizio: '2026-11-16', fine: '2026-11-22' }
  const dopo = { inizio: '2026-11-23', fine: '2026-11-29' }
  // Il cliente vero si riscrive dalla stessa connessione da cui si era iscritto.
  const base = { ...baseIniziale, mittente: 'conn-cliente' }

  it('con un’altra settimana valida sostituisce quella salvata e restituisce lo stesso id', async () => {
    const { db, elenco } = salone()
    const uno = await iscrivitiAttesaPer({ ...base, settimana: prima }, db)
    const due = await iscrivitiAttesaPer({ ...base, settimana: dopo }, db)
    expect(due).toEqual(uno)
    expect(elenco(`${BASE}/attesa`)).toHaveLength(1)
    expect(elenco(`${BASE}/attesa`)[0].settimana).toEqual(dopo)
  })

  it('senza settimana (o non valida) toglie quella salvata: vale «qualunque giorno»', async () => {
    for (const settimana of [undefined, 'x']) {
      const { db, elenco } = salone()
      const uno = await iscrivitiAttesaPer({ ...base, settimana: prima }, db)
      expect(await iscrivitiAttesaPer({ ...base, settimana }, db)).toEqual(uno)
      expect(elenco(`${BASE}/attesa`)).toHaveLength(1)
      expect(elenco(`${BASE}/attesa`)[0]).not.toHaveProperty('settimana')
    }
  })

  it('con la stessa settimana lascia tutto com’è e restituisce lo stesso id', async () => {
    const { db, elenco } = salone()
    const uno = await iscrivitiAttesaPer({ ...base, settimana: prima }, db)
    const prima1 = elenco(`${BASE}/attesa`)
    expect(await iscrivitiAttesaPer({ ...base, settimana: { ...prima } }, db)).toEqual(uno)
    expect(elenco(`${BASE}/attesa`)).toEqual(prima1)
  })
})

describe('iscrivitiAttesaPer: chi conosce email e nome del cane non cambia l’iscrizione di un altro', () => {
  const prima = { inizio: '2026-11-16', fine: '2026-11-22' }
  const vittima = { ...baseIniziale, mittente: 'conn-cliente', settimana: prima, lingua: 'it' }

  it('da un’altra connessione o senza connessione il documento resta uguale e la pagina lo dice', async () => {
    for (const mittente of ['conn-altro', '', undefined]) {
      const { db, elenco } = salone()
      expect((await iscrivitiAttesaPer(vittima, db)).ok).toBe(true)
      const salvato = elenco(`${BASE}/attesa`)
      const esito = await iscrivitiAttesaPer({ ...baseIniziale, mittente, settimana: { inizio: '2026-11-23', fine: '2026-11-29' }, lingua: 'de' }, db)
      expect(esito).toEqual({ ok: true, iscrittoId: '', giaInLista: true })
      expect(elenco(`${BASE}/attesa`)).toEqual(salvato)
    }
  })

  it('una riga senza mittente non si aggiorna nemmeno con mittente vuoto', async () => {
    const { db, elenco } = salone()
    await iscrivitiAttesaPer({ ...baseIniziale, settimana: prima }, db)
    const salvato = elenco(`${BASE}/attesa`)
    expect((await iscrivitiAttesaPer({ ...baseIniziale }, db))).toMatchObject({ giaInLista: true })
    expect(elenco(`${BASE}/attesa`)).toEqual(salvato)
  })

  it('i tentativi contano nel tetto della connessione anche quando il cliente è già in lista', async () => {
    const { db, store } = salone()
    await iscrivitiAttesaPer(vittima, db)
    for (let i = 0; i < 6; i += 1) await iscrivitiAttesaPer({ ...baseIniziale, mittente: 'conn-altro' }, db)
    expect(await iscrivitiAttesaPer({ ...baseIniziale, mittente: 'conn-altro' }, db)).toEqual({ ok: false, errore: 'tante' })
    expect(store.has('mittentiLimiti/conn-altro')).toBe(true)
  })

  it('una settimana già finita non si salva, né all’iscrizione né riscrivendosi', async () => {
    const passata = { inizio: '2026-10-26', fine: '2026-11-01' }
    const { db, elenco } = salone()
    await iscrivitiAttesaPer({ ...vittima, settimana: passata }, db)
    expect(elenco(`${BASE}/attesa`)[0]).not.toHaveProperty('settimana')
    await iscrivitiAttesaPer({ ...vittima, settimana: prima }, db)
    await iscrivitiAttesaPer({ ...vittima, settimana: passata }, db)
    expect(elenco(`${BASE}/attesa`)[0]).not.toHaveProperty('settimana')
    // La settimana in corso (finisce dopo oggi) resta valida.
    await iscrivitiAttesaPer({ ...vittima, settimana: { inizio: '2026-11-02', fine: '2026-11-08' } }, db)
    expect(elenco(`${BASE}/attesa`)[0].settimana).toEqual({ inizio: '2026-11-02', fine: '2026-11-08' })
  })
})
