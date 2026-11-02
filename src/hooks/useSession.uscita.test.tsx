// @vitest-environment happy-dom
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ordine = vi.hoisted(() => [] as string[])
const clientMock = vi.hoisted(() => ({
  signOutEmail: vi.fn(async () => { ordine.push('scollega') }),
  svuotaCacheCloud: vi.fn(async () => { ordine.push('svuota') }),
}))
const uscitaMock = vi.hoisted(() => ({
  pulisciDatiAccount: vi.fn((uid: string) => { ordine.push(`pulisci:${uid}`) }),
  ripartiDaAccesso: vi.fn(() => { ordine.push('riparti') }),
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
  rilasciaPushDelTelefono: vi.fn(async () => undefined),
}))

vi.mock('../data/local/uscita', () => uscitaMock)

vi.mock('../lib/tombstone', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/tombstone')>()
  return { ...original, dimenticaEliminazioni: tombstoneMock.dimenticaEliminazioni }
})

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }))

import { SessionProvider, useSession } from './useSession'

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
    expect(ordine).toEqual(['scollega', 'pulisci:u1', 'eliminazioni:u1', 'svuota', 'riparti'])
  })

  it('se lo scollegamento fallisce pulisce e riparte lo stesso', async () => {
    clientMock.signOutEmail.mockImplementationOnce(async () => {
      ordine.push('scollega')
      throw new Error('offline')
    })
    const { api } = await monta()
    act(() => { api().logout() })
    await waitFor(() => expect(uscitaMock.ripartiDaAccesso).toHaveBeenCalledTimes(1))
    expect(ordine).toEqual(['scollega', 'pulisci:u1', 'eliminazioni:u1', 'svuota', 'riparti'])
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
