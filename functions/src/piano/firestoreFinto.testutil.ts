/**
 * Firestore finto per i test (solo vitest, escluso dalla compilazione delle functions).
 * Uso:
 *   const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
 *   vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))
 * Supporta doc/collection/where/limit, set (anche con merge profondo), update con percorsi a punti,
 * delete, runTransaction e FieldValue.delete(). `scritture` conta le scritture fatte.
 */

type Dati = Record<string, unknown>

const CANCELLA = Symbol('FieldValue.delete')

function isRecord(value: unknown): value is Dati {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && (value as { [CANCELLA]?: true })[CANCELLA] !== true
}

function eCancella(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as { [CANCELLA]?: true })[CANCELLA] === true
}

function copia<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

function unisci(base: Dati, aggiunta: Dati): Dati {
  const out: Dati = { ...base }
  for (const [chiave, valore] of Object.entries(aggiunta)) {
    if (eCancella(valore)) delete out[chiave]
    else if (isRecord(valore) && isRecord(out[chiave])) out[chiave] = unisci(out[chiave] as Dati, valore)
    else if (isRecord(valore)) out[chiave] = unisci({}, valore)
    else out[chiave] = copia(valore)
  }
  return out
}

function senzaCancellazioni(dati: Dati): Dati {
  return unisci({}, dati)
}

function aggiornaPercorso(base: Dati, percorso: string, valore: unknown): Dati {
  const out = structuredClone(base)
  const parti = percorso.split('.')
  let nodo: Dati = out
  for (const parte of parti.slice(0, -1)) {
    if (!isRecord(nodo[parte])) {
      if (eCancella(valore)) return out
      nodo[parte] = {}
    }
    nodo = nodo[parte] as Dati
  }
  const ultima = parti[parti.length - 1]
  if (eCancella(valore)) delete nodo[ultima]
  else nodo[ultima] = isRecord(valore) ? senzaCancellazioni(valore) : copia(valore)
  return out
}

export function firestoreFinto(archivio: Map<string, Dati>) {
  const stato = { scritture: 0 }
  const idDi = (chiave: string) => chiave.slice(chiave.lastIndexOf('/') + 1)
  const figli = (percorso: string) => [...archivio.keys()].filter((chiave) =>
    chiave.startsWith(`${percorso}/`) && !chiave.slice(percorso.length + 1).includes('/'))

  const snapDoc = (chiave: string) => {
    const dati = copia(archivio.get(chiave))
    return {
      exists: dati !== undefined,
      id: idDi(chiave),
      ref: documento(chiave),
      data: () => dati,
      get: (campo: string) => dati?.[campo],
    }
  }

  type Query = { tipo: 'query'; get: () => Promise<{ empty: boolean; docs: ReturnType<typeof snapDoc>[] }> }
  const query = (percorso: string, filtro: (chiave: string) => boolean, max = Infinity): Query & Dati => ({
    tipo: 'query',
    where: (campo: string, _op: string, valore: unknown) =>
      query(percorso, (chiave) => filtro(chiave) && archivio.get(chiave)?.[campo] === valore, max),
    orderBy: () => query(percorso, filtro, max),
    limit: (n: number) => query(percorso, filtro, n),
    get: async () => {
      const docs = figli(percorso).filter(filtro).slice(0, max).map(snapDoc)
      return { empty: docs.length === 0, docs }
    },
  })

  const scrivi = {
    set: (percorso: string, dati: Dati, opzioni?: { merge?: boolean }) => {
      stato.scritture += 1
      const base = opzioni?.merge ? archivio.get(percorso) ?? {} : {}
      archivio.set(percorso, unisci(base, dati))
    },
    update: (percorso: string, dati: Dati) => {
      stato.scritture += 1
      const attuale = archivio.get(percorso)
      if (attuale === undefined) throw new Error(`NOT_FOUND: ${percorso}`)
      let out = attuale
      for (const [campo, valore] of Object.entries(dati)) out = aggiornaPercorso(out, campo, valore)
      archivio.set(percorso, out)
    },
    delete: (percorso: string) => {
      stato.scritture += 1
      archivio.delete(percorso)
    },
  }

  const documento = (percorso: string): Dati & { path: string } => ({
    path: percorso,
    get: async () => snapDoc(percorso),
    set: async (dati: Dati, opzioni?: { merge?: boolean }) => scrivi.set(percorso, dati, opzioni),
    update: async (dati: Dati) => scrivi.update(percorso, dati),
    delete: async () => scrivi.delete(percorso),
  })

  const db = {
    doc: documento,
    collection: (percorso: string) => query(percorso, () => true),
    runTransaction: async <T>(corpo: (tx: unknown) => Promise<T>): Promise<T> => {
      let scritto = false
      const tx = {
        get: async (ref: { path?: string; tipo?: string; get: () => Promise<unknown> }) => {
          if (scritto) throw new Error('Le letture della transazione vanno prima delle scritture')
          return ref.get()
        },
        set: (ref: { path: string }, dati: Dati, opzioni?: { merge?: boolean }) => {
          scritto = true
          scrivi.set(ref.path, dati, opzioni)
          return tx
        },
        update: (ref: { path: string }, dati: Dati) => {
          scritto = true
          scrivi.update(ref.path, dati)
          return tx
        },
        delete: (ref: { path: string }) => {
          scritto = true
          scrivi.delete(ref.path)
          return tx
        },
      }
      return corpo(tx)
    },
  }

  return {
    stato,
    FieldPath: { documentId: () => '__name__' },
    FieldValue: { delete: () => ({ [CANCELLA]: true }) },
    getFirestore: () => db,
  }
}
