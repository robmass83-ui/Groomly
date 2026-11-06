import { chiaveEmail } from './silenzioEmail'
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
const { romeDay } = await import('../../../src/lib/romeTime')
const oggi = () => romeDay(new Date())

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
    archivio.set('salons/s1/dogs/d1', { name: 'Rex', contact: { name: 'Ada', email: 'ada@cliente.it' } })
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

  it('un indirizzo bloccato non parte nemmeno a mano', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo' })
    archivio.set(`salons/s1/emailBloccate/${chiaveEmail(riga.email)}`, { email: riga.email })
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'chiave', fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(esito?.stato).toBe('fermata')
  })

  it('con Plus la email parte', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo' })
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'chiave', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(esito?.stato).toBe('inviata')
  })
})

describe('iscrittoDi con la settimana', () => {
  it('porta una settimana valida e ignora una non valida', async () => {
    const { iscrittoDi } = await import('./giraCoda')
    const settimana = { inizio: '2026-11-16', fine: '2026-11-22' }
    expect(iscrittoDi('i1', { nome: 'Ada', settimana })?.settimana).toEqual(settimana)
    expect(iscrittoDi('i1', { nome: 'Ada', settimana: 'x' })).not.toHaveProperty('settimana')
    expect(iscrittoDi('i1', { nome: 'Ada' })).not.toHaveProperty('settimana')
  })
})

describe('una riga con un id che Firestore rifiuta', () => {
  beforeEach(() => archivio.clear())

  it('non parte: fallirebbe il salvataggio dopo la spedizione', async () => {
    archivio.set('salons/s1/settings/main', { codaEmail: [{ ...riga, id: '__x__' }] })
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo' })
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }))
    expect(await inviaSubitoRiga({ salonId: 's1', id: '__x__', apiKey: 'k', fetchImpl: fetchImpl as typeof fetch })).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('il conto del tetto', () => {
  beforeEach(() => archivio.clear())

  it('sale prima di spedire, così una scrittura fallita dopo non lo azzera', async () => {
    archivio.set('salons/s1/settings/main', { codaEmail: [riga] })
    archivio.set('salons/s1/dogs/d1', { name: 'Rex', contact: { name: 'Ada', email: 'ada@cliente.it' } })
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo' })
    archivio.set('sistema/postaGiorno', { giorno: oggi(), n: 300, perSalone: { s1: 300 }, accesi: ['s1'] })
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }))
    await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'k', fetchImpl: fetchImpl as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('una riga scritta dal client', () => {
  const brevo = () => vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 201 }))

  beforeEach(() => {
    archivio.clear()
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo' })
    archivio.set('salons/s1/dogs/d1', { name: 'Rex', contact: { name: 'Ada', email: 'ada@cliente.it' } })
  })

  it('parte verso l’indirizzo del cane, non verso quello scritto nella riga', async () => {
    archivio.set('salons/s1/settings/main', { codaEmail: [{ ...riga, email: 'estraneo@altro.it', nomeCane: 'Compra qui' }] })
    const fetchImpl = brevo()
    await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })
    const corpo = String(fetchImpl.mock.calls[0]?.[1]?.body)
    expect(corpo).toContain('ada@cliente.it')
    expect(corpo).not.toContain('estraneo@altro.it')
    expect(corpo).not.toContain('Compra qui')
  })

  it('senza il cane non parte', async () => {
    archivio.set('salons/s1/settings/main', { codaEmail: [{ ...riga, dogId: 'inventato' }] })
    const fetchImpl = brevo()
    expect(await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('una recensione usa il link delle impostazioni, non quello della riga', async () => {
    archivio.set('salons/s1/settings/main', {
      linkRecensioni: 'https://recensioni.example/salone',
      codaEmail: [{ ...riga, tipo: 'recensione', url: 'https://truffa.example/' }],
    })
    const fetchImpl = brevo()
    await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })
    const corpo = String(fetchImpl.mock.calls[0]?.[1]?.body)
    expect(corpo).toContain('recensioni.example')
    expect(corpo).not.toContain('truffa.example')
  })

  it('il link di disiscrizione è firmato', async () => {
    archivio.set('salons/s1/settings/main', { codaEmail: [riga] })
    const fetchImpl = brevo()
    await inviaSubitoRiga({ salonId: 's1', id: 'r1', apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(String(fetchImpl.mock.calls[0]?.[1]?.body)).toMatch(/firma=[0-9a-f]{32}/)
  })
})
