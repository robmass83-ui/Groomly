// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readDeletion, readPendingDogDeletions } from '../lib/tombstone'
import type { Dog } from '../types/models'
import { useDogs } from './useDogs'

const mocks = vi.hoisted(() => ({
  dogListener: null as ((items: Dog[], fromCache?: boolean) => void) | null,
  removeDog: vi.fn(async (..._args: unknown[]) => undefined),
  firebase: true,
  local: false,
}))

vi.mock('./useSession', () => ({
  useSession: () => ({ gate: { kind: 'out' } }),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => mocks.firebase,
  readsLocal: () => mocks.local,
  subscribeSource: () => () => undefined,
  markSalonMirror: () => undefined,
  notifySaveFailed: () => undefined,
  subscribeCloudUnavailable: () => () => undefined,
}))

vi.mock('../data/firebase/client', () => ({
  listenDogs: async (_uid: string, onData: (items: Dog[], fromCache?: boolean) => void) => {
    mocks.dogListener = onData
    return () => undefined
  },
  removeDog: (...args: unknown[]) => mocks.removeDog(...args),
  saveDog: vi.fn(async () => undefined),
}))

function dog(id: string): Dog {
  return {
    id,
    name: id,
    contact: { name: 'Anna', phone: '3331234567' },
    contacts: [],
    servicePrices: [],
    hiddenServiceIds: [],
    gallery: [],
    tags: [],
    customFields: [],
    status: 'attivo',
    searchKey: id,
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  } as unknown as Dog
}

describe('useDogs', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.dogListener = null
    mocks.removeDog.mockClear()
    mocks.firebase = true
    mocks.local = false
  })

  it('remove passa gli id futuri a removeDog e alla cancellazione in sospeso', async () => {
    const { result } = renderHook(() => useDogs('u'))
    await waitFor(() => expect(mocks.dogListener).not.toBeNull())
    act(() => {
      mocks.dogListener?.([dog('rex')], false)
    })
    act(() => {
      expect(result.current.remove('rex', ['f1'])).toBe(true)
    })
    expect(readPendingDogDeletions()).toEqual([{ id: 'rex', visitIds: ['f1'] }])
    expect(readDeletion().storicoIds).toEqual(['rex'])
    await waitFor(() => expect(mocks.removeDog).toHaveBeenCalledWith('u', 'rex', undefined, ['f1']))
  })

  it('remove salva nella cancellazione in sospeso anche il percorso vecchio del cane', async () => {
    const { result } = renderHook(() => useDogs('u'))
    await waitFor(() => expect(mocks.dogListener).not.toBeNull())
    act(() => {
      mocks.dogListener?.([{ ...dog('scheda-nuova'), sourceDocId: 'percorso-vecchio' }], false)
    })
    act(() => {
      expect(result.current.remove('scheda-nuova', [])).toBe(true)
    })
    expect(readPendingDogDeletions()).toEqual([{ id: 'scheda-nuova', visitIds: [], sourceDocId: 'percorso-vecchio' }])
    await waitFor(() => expect(mocks.removeDog).toHaveBeenCalledWith('u', 'scheda-nuova', 'percorso-vecchio', []))
  })

  it('senza Firebase la lista locale vale come arrivata dal server', async () => {
    mocks.firebase = false
    const { result } = renderHook(() => useDogs('u'))
    await waitFor(() => expect(result.current.settled).toBe(true))
    expect(result.current.dalServer).toBe(true)
  })

  it('con i dati locali la lista vale come arrivata dal server', async () => {
    mocks.local = true
    const { result } = renderHook(() => useDogs('u'))
    await waitFor(() => expect(result.current.dalServer).toBe(true))
  })

  it('dalServer diventa vero solo con lo snapshot del server', async () => {
    const { result } = renderHook(() => useDogs('u'))
    await waitFor(() => expect(mocks.dogListener).not.toBeNull())
    expect(result.current.dalServer).toBe(false)
    act(() => {
      mocks.dogListener?.([dog('rex')], true)
      mocks.dogListener?.([dog('rex')], true)
    })
    expect(result.current.dalServer).toBe(false)
    act(() => {
      mocks.dogListener?.([dog('rex')], false)
    })
    expect(result.current.dalServer).toBe(true)
  })
})
