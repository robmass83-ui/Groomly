// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listClosures } from '../data/local/closures'
import { buildBackup } from '../lib/backupDoc'
import type { Closure } from '../lib/closures'
import { useClosures } from './useClosures'

const mocks = vi.hoisted(() => ({
  closureListener: null as ((items: Closure[], fromCache?: boolean) => void) | null,
  saveClosure: vi.fn(async (..._args: unknown[]) => undefined),
  removeClosure: vi.fn(async (..._args: unknown[]) => undefined),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
  notifySaveFailed: () => undefined,
}))

vi.mock('../data/firebase/client', () => ({
  listenClosures: async (_uid: string, onData: (items: Closure[], fromCache?: boolean) => void) => {
    mocks.closureListener = onData
    return () => undefined
  },
  saveClosure: (...args: unknown[]) => mocks.saveClosure(...args),
  removeClosure: (...args: unknown[]) => mocks.removeClosure(...args),
}))

function closure(partial: Partial<Closure> = {}): Closure {
  return {
    id: 'c1',
    reason: 'Ferie',
    startDay: '2026-08-20',
    endDay: '2026-08-24',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    ...partial,
  }
}

describe('chiusure nello specchio locale', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.closureListener = null
    mocks.saveClosure.mockClear()
    mocks.removeClosure.mockClear()
  })

  it('lo snapshot entra nella chiave locale e un salvataggio non fa sparire le righe solo cloud', async () => {
    const fromOtherPhone = closure({ id: 'cloud' })
    const { result } = renderHook(() => useClosures('uid-1'))
    await waitFor(() => expect(mocks.closureListener).not.toBeNull())

    act(() => { mocks.closureListener?.([fromOtherPhone], false) })

    expect(listClosures('uid-1')).toEqual([fromOtherPhone])
    expect(Object.keys(buildBackup('uid-1').closures as object)).toEqual(['cloud'])

    await act(async () => {
      await result.current.save(closure({ id: 'local', reason: 'Malattia', startDay: '2026-09-01', endDay: '2026-09-01' }))
    })

    expect(result.current.closures.map((item) => item.id).sort()).toEqual(['cloud', 'local'])
    expect(listClosures('uid-1').map((item) => item.id).sort()).toEqual(['cloud', 'local'])
  })

  it('una chiusura appena salvata resta se lo snapshot non la contiene ancora, e sparisce quando il cloud la cancella', async () => {
    const shared = closure({ id: 'cloud' })
    const { result } = renderHook(() => useClosures('uid-1'))
    await waitFor(() => expect(mocks.closureListener).not.toBeNull())
    act(() => { mocks.closureListener?.([shared], false) })

    await act(async () => {
      await result.current.save(closure({ id: 'fresh', reason: 'Corso', startDay: '2026-09-10', endDay: '2026-09-12' }))
    })
    act(() => { mocks.closureListener?.([shared], false) })

    expect(result.current.closures.map((item) => item.id).sort()).toEqual(['cloud', 'fresh'])
    expect(listClosures('uid-1').map((item) => item.id).sort()).toEqual(['cloud', 'fresh'])

    const fresh = result.current.closures.find((item) => item.id === 'fresh')
    act(() => { mocks.closureListener?.([shared, fresh as Closure], false) })
    act(() => { mocks.closureListener?.([shared], false) })

    expect(result.current.closures.map((item) => item.id)).toEqual(['cloud'])
    expect(listClosures('uid-1').map((item) => item.id)).toEqual(['cloud'])
  })

  it('aggiornare una chiusura già nello snapshot non la conserva se il cloud la omette', async () => {
    const shared = closure({ id: 'cloud' })
    const { result } = renderHook(() => useClosures('uid-1'))
    await waitFor(() => expect(mocks.closureListener).not.toBeNull())
    act(() => { mocks.closureListener?.([shared], false) })

    await act(async () => {
      await result.current.save(closure({ id: 'cloud', reason: 'Ferie aggiornate' }))
    })
    act(() => { mocks.closureListener?.([], false) })

    expect(result.current.closures).toEqual([])
    expect(listClosures('uid-1')).toEqual([])
  })

  it('uno snapshot vuoto dalla cache non cancella le chiusure locali', async () => {
    const { result } = renderHook(() => useClosures('uid-1'))
    await waitFor(() => expect(mocks.closureListener).not.toBeNull())
    act(() => { mocks.closureListener?.([closure()], false) })
    act(() => { mocks.closureListener?.([], true) })

    expect(result.current.closures.map((item) => item.id)).toEqual(['c1'])
    expect(listClosures('uid-1').map((item) => item.id)).toEqual(['c1'])
  })

  it('dopo la rimozione resta la chiusura arrivata solo dallo snapshot', async () => {
    const cloud = closure({ id: 'cloud' })
    const other = closure({ id: 'other', reason: 'Malattia', startDay: '2026-09-01', endDay: '2026-09-01' })
    const { result } = renderHook(() => useClosures('uid-1'))
    await waitFor(() => expect(mocks.closureListener).not.toBeNull())
    act(() => { mocks.closureListener?.([cloud, other], false) })

    await act(async () => { await result.current.remove('cloud') })

    expect(result.current.closures.map((item) => item.id)).toEqual(['other'])
    expect(listClosures('uid-1').map((item) => item.id)).toEqual(['other'])
    expect(mocks.removeClosure).toHaveBeenCalledWith('uid-1', 'cloud')
  })
})
