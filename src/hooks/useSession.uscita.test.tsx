// @vitest-environment happy-dom
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ordine = vi.hoisted(() => [] as string[])
const clientMock = vi.hoisted(() => ({
  signOutEmail: vi.fn(async () => { ordine.push('scollega') }),
  svuotaCacheCloud: vi.fn(async () => { ordine.push('svuota') }),
  rilasciaPushDelTelefono: vi.fn(async (_uid: string, _device: string, _token: string) => undefined),
}))
const uscitaMock = vi.hoisted(() => ({
  pulisciDatiAccount: vi.fn((uid: string) => { ordine.push(`pulisci:${uid}`) }),
  ripartiDaAccesso: vi.fn(() => { ordine.push('riparti') }),
  segnaUscita: vi.fn((uid: string) => { ordine.push(`segna:${uid}`) }),
}))
const tombstoneMock = vi.hoisted(() => ({
  dimenticaEliminazioni: vi.fn((uid: string) => { ordine.push(`eliminazioni:${uid}`) }),
}))

vi.mock('../data/firebase/client', () => ({
  watchAuth: (listener: (account: unknown) => void) => {
    listener({ uid: 'u1', email: 'a@x.it', firstName: '', lastName: '', salonId: 'u1' })
    return () => undefined
  },
  lastEmailVerified: () => true,
  signOutEmail: clientMock.signOutEmail,
  svuotaCacheCloud: clientMock.svuotaCacheCloud,
  rilasciaPushDelTelefono: clientMock.rilasciaPushDelTelefono,
}))

vi.mock('../data/local/uscita', () => uscitaMock)

vi.mock('../lib/tombstone', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/tombstone')>()
  return { ...original, dimenticaEliminazioni: tombstoneMock.dimenticaEliminazioni }
})

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }))

import { SessionProvider, useSession } from './useSession'
import { PUSH_TOKEN_KEY } from '../lib/pushDevice'

type Api = ReturnType<typeof useSession>

async function monta(): Promise<{ api: () => Api }> {
  let corrente: Api | null = null
  function Figlio() {
    corrente = useSession()
    return null
  }
  render(<SessionProvider><Figlio /></SessionProvider>)
  await waitFor(() => expect(corrente?.gate.kind).toBe('in'))
  return { api: () => corrente as unknown as Api }
}

describe('Esci pulisce il telefono e riparte', () => {
  beforeEach(() => {
    localStorage.clear()
    ordine.length = 0
    vi.clearAllMocks()
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('scollega, pulisce, svuota la cache e riparte, in quest’ordine', async () => {
    const { api } = await monta()
    act(() => { api().logout() })
    await waitFor(() => expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1))
    expect(ordine).toEqual(['scollega', 'segna:u1', 'pulisci:u1', 'eliminazioni:u1', 'svuota', 'pulisci:u1', 'riparti'])
  })

  it('se lo scollegamento fallisce pulisce e riparte lo stesso', async () => {
    clientMock.signOutEmail.mockImplementationOnce(async () => {
      ordine.push('scollega')
      throw new Error('offline')
    })
    const { api } = await monta()
    act(() => { api().logout() })
    await waitFor(() => expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1))
    expect(ordine).toEqual(['scollega', 'segna:u1', 'pulisci:u1', 'eliminazioni:u1', 'svuota', 'pulisci:u1', 'riparti'])
  })

  it('se svuotare la cache fallisce riparte lo stesso', async () => {
    clientMock.svuotaCacheCloud.mockImplementationOnce(async () => {
      ordine.push('svuota')
      throw new Error('altra scheda')
    })
    const { api } = await monta()
    act(() => { api().logout() })
    await waitFor(() => expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1))
    expect(ordine.at(-1)).toBe('riparti')
  })

  it('se svuotare la cache resta bloccato riparte dopo al massimo 2,5 s', async () => {
    const { api } = await monta()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      clientMock.svuotaCacheCloud.mockImplementationOnce(() => {
        ordine.push('svuota')
        return new Promise<void>(() => undefined)
      })
      act(() => { api().logout() })
      await vi.advanceTimersByTimeAsync(2000)
      expect(uscitaMock.ripartiDaAccesso).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(600)
      expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1)
      expect(ordine.slice(-2)).toEqual(['pulisci:u1', 'riparti'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('offline, se staccare il telefono dalle notifiche resta appeso, esce dopo al massimo 2,5 s', async () => {
    localStorage.setItem(PUSH_TOKEN_KEY, 'tok')
    const { api } = await monta()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      clientMock.rilasciaPushDelTelefono.mockImplementationOnce(() => {
        ordine.push('rilascia')
        return new Promise<undefined>(() => undefined)
      })
      act(() => { api().logout() })
      await vi.advanceTimersByTimeAsync(2000)
      expect(clientMock.rilasciaPushDelTelefono).toHaveBeenCalledTimes(1)
      expect(clientMock.signOutEmail).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(600)
      expect(clientMock.signOutEmail).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(100)
      expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1)
      expect(ordine).toEqual(['rilascia', 'scollega', 'segna:u1', 'pulisci:u1', 'eliminazioni:u1', 'svuota', 'pulisci:u1', 'riparti'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('due Esci di fila: una sola uscita', async () => {
    const { api } = await monta()
    const logout = api().logout
    act(() => {
      logout()
      logout()
    })
    await waitFor(() => expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1)
    expect(clientMock.signOutEmail).toHaveBeenCalledTimes(1)
  })

  it('in modalità locale non pulisce e non riparte', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    let corrente: Api | null = null
    function Figlio() {
      corrente = useSession()
      return null
    }
    render(<SessionProvider><Figlio /></SessionProvider>)
    act(() => { (corrente as unknown as Api).logout() })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(uscitaMock.pulisciDatiAccount).not.toHaveBeenCalled()
    expect(uscitaMock.ripartiDaAccesso).not.toHaveBeenCalled()
    expect(clientMock.svuotaCacheCloud).not.toHaveBeenCalled()
  })
})
