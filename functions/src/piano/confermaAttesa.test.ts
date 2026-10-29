import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { confermaAttesaPer } from './confermaAttesa'

// Un Firestore in memoria con quanto serve alla conferma: documenti, collezioni, where '==' e transazioni
// ottimistiche come quelle vere. Le transazioni girano insieme. Ogni lettura fatta con tx.get si ricorda com'era,
// e al commit, se qualcosa letto è cambiato nel frattempo, il giro si ripete da capo. Una lettura fuori dalla
// transazione non si ricorda: chi la usa non ha nessuna protezione, e il test lo vede.
type Dati = Record<string, unknown>

interface Opzioni {
  /** Si chiama dopo ogni tx.get riuscito, con il numero del tentativo: serve a far leggere due conferme prima di un commit. */
  dopoLettura?: (path: string, tentativo: number) => Promise<void>
}

function eCancella(valore: unknown): boolean {
  return typeof valore === 'object' && valore !== null && 'isEqual' in valore
    && typeof valore.isEqual === 'function' && (valore.isEqual as (altro: unknown) => boolean).call(valore, FieldValue.delete())
}

function unisci(vecchio: Dati, dati: Dati): Dati {
  const unito = { ...vecchio, ...dati }
  for (const chiave of Object.keys(dati)) if (eCancella(dati[chiave])) delete unito[chiave]
  return unito
}

function memoria(iniziale: Record<string, Dati>, opzioni: Opzioni = {}) {
  const store = new Map<string, Dati>(Object.entries(iniziale))
  const letture: string[] = []
  let contatore = 0

  const snap = (path: string) => {
    const dati = store.get(path)
    return {
      id: path.split('/').pop() as string,
      exists: dati !== undefined,
      ref: ref(path),
      data: () => (dati ? structuredClone(dati) : undefined),
      get: (campo: string) => dati?.[campo],
    }
  }
  const figli = (path: string) => [...store.keys()].filter((chiave) => chiave.startsWith(`${path}/`) && !chiave.slice(path.length + 1).includes('/'))
  const firma = (cosa: { tipo: string, path: string }) => JSON.stringify(
    cosa.tipo === 'doc' ? store.get(cosa.path) ?? null : figli(cosa.path).map((chiave) => [chiave, store.get(chiave)]),
  )
  const ref = (path: string) => ({ tipo: 'doc', path, id: path.split('/').pop() as string, get: async () => snap(path) })
  const interroga = (path: string, filtri: [string, unknown][], max: number) => ({
    tipo: 'coll',
    path,
    where: (campo: string, _op: string, valore: unknown) => interroga(path, [...filtri, [campo, valore]], max),
    limit: (n: number) => interroga(path, filtri, n),
    doc: (id?: string) => ref(`${path}/${id ?? `auto${++contatore}`}`),
    get: async () => {
      const docs = figli(path)
        .filter((chiave) => filtri.every(([campo, valore]) => store.get(chiave)?.[campo] === valore))
        .slice(0, max)
        .map((chiave) => snap(chiave))
      return { docs, empty: docs.length === 0 }
    },
  })
  const db = {
    doc: (path: string) => ref(path),
    collection: (path: string) => interroga(path, [], Infinity),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      for (let tentativo = 0; tentativo < 5; tentativo += 1) {
        const lette = new Map<string, string>()
        const scritture: (() => void)[] = []
        const tx = {
          get: async (cosa: { tipo: string, path: string, get: () => Promise<unknown> }) => {
            const risultato = await cosa.get()
            lette.set(`${cosa.tipo}:${cosa.path}`, firma(cosa))
            letture.push(cosa.path)
            await opzioni.dopoLettura?.(cosa.path, tentativo)
            return risultato
          },
          set: (r: { path: string }, dati: Dati, opz?: { merge?: boolean }) => {
            scritture.push(() => store.set(r.path, opz?.merge ? unisci(store.get(r.path) ?? {}, dati) : unisci({}, dati)))
          },
          update: (r: { path: string }, dati: Dati) => {
            scritture.push(() => store.set(r.path, unisci(store.get(r.path) ?? {}, dati)))
          },
        }
        const risultato = await fn(tx)
        // Controllo e scrittura senza pause in mezzo: o tutto o si riparte.
        const cambiato = [...lette].some(([chiave, vista]) => {
          const [tipo, ...resto] = chiave.split(':')
          return firma({ tipo: tipo as string, path: resto.join(':') }) !== vista
        })
        if (cambiato) continue
        scritture.forEach((scrivi) => scrivi())
        return risultato
      }
      throw new Error('troppi tentativi')
    },
  }
  const elenco = (path: string) => figli(path).map((chiave) => ({ id: chiave.slice(path.length + 1), ...store.get(chiave) as Dati }))
  return { db: db as unknown as Firestore, store, elenco, letture }
}

const TOKEN = 'ab'.repeat(32)
const INIZIO = '2026-11-04T09:00:00.000Z'
const ADESSO = new Date('2026-11-04T08:00:00.000Z')
const BASE = 'salons/s1'

function salone(extra: Record<string, Dati> = {}, modo = 'manuale', opzioni: Opzioni = {}) {
  return memoria({
    [`${BASE}/settings/main`]: { serviziEmail: { attesa: { modo } } },
    [`${BASE}/appointments/v1`]: { id: 'v1', dogId: 'd0', start: Date.parse(INIZIO), end: Date.parse(INIZIO) + 3_600_000, status: 'disdetto', services: [] },
    [`${BASE}/buchiAttesa/v1`]: { appointmentId: 'v1', inizio: INIZIO, nomeCane: 'Luna' },
    [`${BASE}/offerteAttesa/attesa:v1:i1`]: { token: TOKEN, appointmentId: 'v1', iscrittoId: 'i1', inizio: INIZIO, inviataIl: '2026-11-04T07:00:00.000Z' },
    [`${BASE}/attesa/i1`]: {
      attivo: true, nome: 'Mario', phone: '+3900000000', email: 'm@example.com', nomeCane: 'Rex', specie: 'cane', taglia: 'media',
      servizioId: 'bagno', trattamento: 'Bagno', durataMin: 60, creatoIl: '2026-11-01T10:00:00.000Z',
    },
    [`${BASE}/services/bagno`]: { name: 'Bagno', price: { piccola: 20, media: 30, grande: 40 } },
    ...extra,
  }, opzioni)
}

const conferma = (db: Firestore, azione: 'leggi' | 'conferma' | 'rifiuta' | 'resta' | 'esci', adesso = ADESSO, token = TOKEN) =>
  confermaAttesaPer({ salonId: 's1', token, azione, adesso }, db)

describe('confermaAttesaPer', () => {
  it('conferma con il posto libero scrive la visita, toglie l’iscritto e lascia l’avviso', async () => {
    const { db, store, elenco } = salone()
    const esito = await conferma(db, 'conferma')
    expect(esito.ok && esito.esito === 'confermato').toBe(true)
    const nuove = elenco(`${BASE}/appointments`).filter((visita) => visita.id !== 'v1')
    expect(nuove).toHaveLength(1)
    const visita = nuove[0]
    expect(visita).toMatchObject({
      status: 'programmato',
      start: Date.parse(INIZIO),
      end: Date.parse(INIZIO) + 60 * 60_000,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 30 }],
    })
    expect(esito).toMatchObject({ appointmentId: visita.id, dogId: visita.dogId })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(false)
    const avvisi = elenco(`${BASE}/avvisiAttesa`)
    expect(avvisi).toHaveLength(1)
    expect(avvisi[0]).toMatchObject({ cane: 'Rex', trattamento: 'Bagno', altro: 'Luna', giorno: '2026-11-04' })
    const cani = elenco(`${BASE}/dogs`)
    expect(cani).toHaveLength(1)
    expect(cani[0]).toMatchObject({ id: visita.dogId, name: 'Rex', species: 'cane', size: 'media' })
  })

  it('due conferme dello stesso token: la seconda trova occupato e non scrive un’altra visita', async () => {
    const { db, elenco } = salone()
    const prima = await conferma(db, 'conferma')
    const seconda = await conferma(db, 'conferma')
    expect(prima).toMatchObject({ ok: true, esito: 'confermato' })
    expect(seconda).toEqual({ ok: true, esito: 'occupato' })
    expect(elenco(`${BASE}/appointments`).filter((visita) => visita.id !== 'v1')).toHaveLength(1)
    expect(elenco(`${BASE}/dogs`)).toHaveLength(1)
    expect(elenco(`${BASE}/avvisiAttesa`)).toHaveLength(1)
  })

  it('due conferme che leggono prima di ogni commit: la visita si legge nella transazione e il giro stantio riparte', async () => {
    const percorso = `${BASE}/appointments`
    let arrivate = 0
    let apri: () => void = () => undefined
    const cancello = new Promise<void>((risolvi) => { apri = risolvi })
    const { db, elenco, letture } = salone({}, 'manuale', {
      // Al primo tentativo nessuna delle due scrive finché entrambe hanno letto le visite.
      dopoLettura: async (path, tentativo) => {
        if (path !== percorso || tentativo > 0) return
        arrivate += 1
        if (arrivate >= 2) apri()
        await cancello
      },
    })
    const [a, b] = await Promise.all([conferma(db, 'conferma'), conferma(db, 'conferma')])
    // Se le visite si leggessero fuori da tx.get, nessuna lettura sarebbe ricordata e il commit non controllerebbe niente.
    expect(letture.filter((path) => path === percorso).length).toBeGreaterThan(2)
    expect(arrivate).toBe(2)
    expect([a, b].filter((esito) => esito.ok && esito.esito === 'confermato')).toHaveLength(1)
    expect([a, b].filter((esito) => esito.ok && esito.esito === 'occupato')).toHaveLength(1)
    expect(elenco(percorso).filter((visita) => visita.id !== 'v1')).toHaveLength(1)
    expect(elenco(`${BASE}/dogs`)).toHaveLength(1)
    expect(elenco(`${BASE}/avvisiAttesa`)).toHaveLength(1)
  })

  it('stessa email e stesso nome del cane, dopo trim: usa il cane attivo che c’è com’è e non ne crea un altro', async () => {
    const { db, elenco } = salone({
      [`${BASE}/dogs/gia`]: { id: 'gia', name: ' Rex ', contact: { name: 'Mario', phone: '1', email: ' m@example.com ' }, status: 'attivo', updatedAt: 5 },
      [`${BASE}/dogs/altro`]: { id: 'altro', name: 'rex', contact: { name: 'Mario', phone: '1', email: 'm@example.com' }, status: 'attivo' },
    })
    const esito = await conferma(db, 'conferma')
    expect(esito).toMatchObject({ ok: true, esito: 'confermato', dogId: 'gia' })
    expect(elenco(`${BASE}/dogs`)).toHaveLength(2)
    expect(elenco(`${BASE}/dogs`).find((cane) => cane.id === 'gia')).toMatchObject({ status: 'attivo', updatedAt: 5 })
    expect(elenco(`${BASE}/appointments`).find((visita) => visita.id !== 'v1')).toMatchObject({ dogId: 'gia' })
  })

  it('un cane deceduto con la stessa email e lo stesso nome non si riusa: nasce una scheda nuova', async () => {
    const { db, elenco } = salone({
      [`${BASE}/dogs/morto`]: { id: 'morto', name: 'Rex', contact: { name: 'Mario', phone: '1', email: 'm@example.com' }, status: 'deceduto', updatedAt: 5 },
    })
    const esito = await conferma(db, 'conferma')
    expect(esito).toMatchObject({ ok: true, esito: 'confermato' })
    expect(esito.ok && esito.esito === 'confermato' && esito.dogId).not.toBe('morto')
    const cani = elenco(`${BASE}/dogs`)
    expect(cani).toHaveLength(2)
    expect(cani.find((cane) => cane.id === 'morto')).toMatchObject({ status: 'deceduto', updatedAt: 5 })
    const nuovo = cani.find((cane) => cane.id !== 'morto')
    expect(nuovo).toMatchObject({ name: 'Rex', status: 'attivo' })
    expect(elenco(`${BASE}/appointments`).find((visita) => visita.id !== 'v1')).toMatchObject({ dogId: nuovo?.id })
  })

  it('un cane non più in cura con la stessa email e lo stesso nome si riusa e torna attivo', async () => {
    const { db, elenco } = salone({
      [`${BASE}/dogs/fermo`]: {
        id: 'fermo', name: 'Rex', contact: { name: 'Mario', phone: '1', email: 'm@example.com' },
        status: 'non_in_cura', archivedAt: 3, updatedAt: 5,
      },
    })
    const esito = await conferma(db, 'conferma')
    expect(esito).toMatchObject({ ok: true, esito: 'confermato', dogId: 'fermo' })
    const cani = elenco(`${BASE}/dogs`)
    expect(cani).toHaveLength(1)
    expect(cani[0]).toMatchObject({ id: 'fermo', status: 'attivo', updatedAt: ADESSO.getTime() })
    expect(cani[0]).not.toHaveProperty('archivedAt')
    expect(elenco(`${BASE}/appointments`).find((visita) => visita.id !== 'v1')).toMatchObject({ dogId: 'fermo' })
  })

  it('rifiuta lascia attivo e non scrive, resta lascia attivo, esci spegne', async () => {
    const { db, store, elenco } = salone()
    expect(await conferma(db, 'rifiuta')).toEqual({ ok: true, esito: 'rifiutato' })
    expect(await conferma(db, 'resta')).toEqual({ ok: true, esito: 'restato' })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(true)
    expect(elenco(`${BASE}/appointments`)).toHaveLength(1)
    expect(elenco(`${BASE}/avvisiAttesa`)).toHaveLength(0)
    expect(await conferma(db, 'esci')).toEqual({ ok: true, esito: 'uscito' })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(false)
  })

  it('leggi non scrive niente e dice libero', async () => {
    const { db, store } = salone()
    const prima = JSON.stringify([...store.entries()])
    expect(await conferma(db, 'leggi')).toEqual({ ok: true, esito: 'visto', motivo: 'libero' })
    expect(JSON.stringify([...store.entries()])).toBe(prima)
  })

  it('token sconosciuto: errore token, e un id salone strano non legge niente', async () => {
    const { db } = salone()
    expect(await conferma(db, 'leggi', ADESSO, 'cd'.repeat(32))).toEqual({ ok: false, errore: 'token' })
    expect(await conferma(db, 'conferma', ADESSO, 'corto')).toEqual({ ok: false, errore: 'token' })
    expect(await confermaAttesaPer({ salonId: 'a/b', token: TOKEN, azione: 'leggi', adesso: ADESSO }, db)).toEqual({ ok: false, errore: 'token' })
  })

  it('servizio spento: errore spento e nessuna scrittura', async () => {
    const { db, store, elenco } = salone({}, 'spento')
    expect(await conferma(db, 'conferma')).toEqual({ ok: false, errore: 'spento' })
    expect(await conferma(db, 'leggi')).toEqual({ ok: false, errore: 'spento' })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(true)
    expect(elenco(`${BASE}/appointments`)).toHaveLength(1)
  })

  it('la durata sfora il prossimo appuntamento: conferma dice occupato senza visita, leggi dice non_ci_sta', async () => {
    const { db, elenco } = salone({
      [`${BASE}/appointments/dopo`]: { id: 'dopo', dogId: 'd9', start: Date.parse(INIZIO) + 30 * 60_000, end: Date.parse(INIZIO) + 90 * 60_000, status: 'programmato', services: [] },
    })
    expect(await conferma(db, 'leggi')).toEqual({ ok: true, esito: 'visto', motivo: 'non_ci_sta' })
    expect(await conferma(db, 'conferma')).toEqual({ ok: true, esito: 'occupato' })
    expect(elenco(`${BASE}/appointments`)).toHaveLength(2)
    expect(elenco(`${BASE}/dogs`)).toHaveLength(0)
  })

  it('un altro cliente ha preso l’ora, oppure l’ora è passata: leggi lo dice', async () => {
    const preso = salone({
      [`${BASE}/appointments/altro`]: { id: 'altro', dogId: 'd9', start: Date.parse(INIZIO), end: Date.parse(INIZIO) + 3_600_000, status: 'programmato', services: [] },
    })
    expect(await conferma(preso.db, 'leggi')).toEqual({ ok: true, esito: 'visto', motivo: 'occupato' })
    expect(await conferma(preso.db, 'rifiuta')).toEqual({ ok: true, esito: 'visto', motivo: 'occupato' })
    const passato = salone()
    expect(await conferma(passato.db, 'leggi', new Date('2026-11-04T09:30:00.000Z'))).toEqual({ ok: true, esito: 'visto', motivo: 'passato' })
    expect(await conferma(passato.db, 'conferma', new Date('2026-11-04T09:30:00.000Z'))).toEqual({ ok: true, esito: 'occupato' })
    expect(passato.elenco(`${BASE}/appointments`)).toHaveLength(1)
  })

  it('esci vale anche con l’ora presa, e un iscritto già uscito con l’ora libera trova uscito', async () => {
    const preso = salone({
      [`${BASE}/appointments/altro`]: { id: 'altro', dogId: 'd9', start: Date.parse(INIZIO), end: Date.parse(INIZIO) + 3_600_000, status: 'programmato', services: [] },
    })
    expect(await conferma(preso.db, 'esci')).toEqual({ ok: true, esito: 'uscito' })
    expect(preso.store.get(`${BASE}/attesa/i1`)?.attivo).toBe(false)
    const uscito = salone({ [`${BASE}/attesa/i1`]: { attivo: false, nome: 'Mario', nomeCane: 'Rex', email: 'm@example.com', servizioId: 'bagno', trattamento: 'Bagno', durataMin: 60 } })
    expect(await conferma(uscito.db, 'conferma')).toEqual({ ok: true, esito: 'uscito' })
    expect(uscito.elenco(`${BASE}/appointments`)).toHaveLength(1)
  })
})
