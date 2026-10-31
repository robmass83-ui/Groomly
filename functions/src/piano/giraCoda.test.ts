import { beforeEach, describe, expect, it, vi } from 'vitest'

const archivio = new Map<string, Record<string, unknown>>()

function documento(path: string) {
  return {
    get: async () => {
      const dati = archivio.get(path)
      return { data: () => dati, get: (campo: string) => dati?.[campo] }
    },
    set: async (dati: Record<string, unknown>) => {
      archivio.set(path, { ...(archivio.get(path) ?? {}), ...dati })
    },
    path,
  }
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => documento(path),
    batch: () => {
      const operazioni: (() => void)[] = []
      return {
        set: (ref: { path: string }, dati: Record<string, unknown>) => {
          operazioni.push(() => archivio.set(ref.path, { ...(archivio.get(ref.path) ?? {}), ...dati }))
        },
        delete: (ref: { path: string }) => {
          operazioni.push(() => archivio.delete(ref.path))
        },
        commit: async () => operazioni.forEach((operazione) => operazione()),
      }
    },
    runTransaction: async (fn: (tx: unknown) => Promise<void>) => fn({
      get: async (ref: { path: string }) => ({ data: () => archivio.get(ref.path) }),
      set: (ref: { path: string }, dati: Record<string, unknown>) => archivio.set(ref.path, dati),
    }),
  }),
}))

const { inviaSubitoRiga } = await import('./giraCoda')

const riga = {
  id: 'r1',
  tipo: 'pronto',
  dogId: 'd1',
  appointmentId: 'a1',
  evento: 'e1',
  parteIl: null,
  stato: 'in_coda',
  motivo: '',
  email: 'ada@cliente.it',
  nomeCane: 'Rex',
  nomeCliente: 'Ada',
  inizio: null,
}

describe('invia subito secondo il piano', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('salons/s1/settings/main', { serviziEmail: { pronto: { modo: 'manuale' } }, codaEmail: [riga] })
  })

  it('in Go non spedisce una email Plus e non tocca la coda', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'scaduto' })
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'chiave', fetchImpl })
    expect(esito).toEqual({ stato: 'in_coda', motivo: 'piano' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(archivio.get('salons/s1/settings/main')?.codaEmail).toEqual([riga])
    expect(archivio.has('salons/s1/coda/r1')).toBe(false)
  })

  it('senza documento del piano vale come Go', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'chiave', fetchImpl })
    expect(esito?.motivo).toBe('piano')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('con Plus la email parte', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo' })
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'chiave', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(esito?.stato).toBe('inviata')
  })
})
