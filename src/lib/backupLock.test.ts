import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispositivoBackup, lasciaBlocco, prendiBlocco } from './backupLock'

const transactionSalon = vi.fn()

vi.mock('../data/firebase/client', () => ({
  transactionSalon: (...args: unknown[]) => transactionSalon(...args),
}))

describe('blocco del backup', () => {
  beforeEach(() => {
    localStorage.clear()
    transactionSalon.mockReset()
  })

  it('prende il blocco se è libero o è già di questo telefono', async () => {
    const now = new Date('2026-10-24T00:00:00.000Z')
    transactionSalon.mockImplementation(async (run: (tx: { get: () => Promise<null>; set: (kind: string, id: string, data: unknown) => void }) => Promise<void>) => {
      await run({
        get: async () => null,
        set: (_kind, _id, data) => {
          expect(data).toMatchObject({ until: now.getTime() + 30 * 60 * 1000 })
        },
      })
    })
    await prendiBlocco(now)
    const io = dispositivoBackup()
    transactionSalon.mockImplementation(async (run: (tx: { get: () => Promise<{ holder: string; until: number }>; set: () => void }) => Promise<void>) => {
      await run({
        get: async () => ({ holder: io, until: now.getTime() + 1000 }),
        set: () => undefined,
      })
    })
    await prendiBlocco(now)
  })

  it('rifiuta se un altro telefono tiene il blocco e lo lascia solo se è nostro', async () => {
    const now = new Date('2026-10-24T00:00:00.000Z')
    transactionSalon.mockImplementation(async (run: (tx: { get: () => Promise<{ holder: string; until: number }>; set: (kind: string, id: string, data: unknown) => void }) => Promise<void>) => {
      await run({
        get: async () => ({ holder: 'altro', until: now.getTime() + 1000 }),
        set: () => { throw new Error('non doveva scrivere') },
      })
    })
    await expect(prendiBlocco(now)).rejects.toThrow('occupato')
    transactionSalon.mockImplementation(async (run: (tx: { get: () => Promise<{ holder: string }>; set: (kind: string, id: string, data: { until: number }) => void }) => Promise<void>) => {
      await run({
        get: async () => ({ holder: 'altro' }),
        set: () => { throw new Error('non doveva lasciare') },
      })
    })
    await lasciaBlocco()
  })
})
