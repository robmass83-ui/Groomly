// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDog } from '../data/local/dogs'
import type { Appointment, Dog } from '../types/models'
import { useAppointments } from './useAppointments'
import { useDogs } from './useDogs'

const mocks = vi.hoisted(() => ({
  appointmentListeners: new Map<string, (items: Appointment[], fromCache?: boolean) => void>(),
  dogListeners: new Map<string, (items: Dog[], fromCache?: boolean) => void>(),
}))

vi.mock('./useSession', () => ({
  useSession: () => ({ gate: { kind: 'out' } }),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
  readsLocal: () => false,
  subscribeSource: () => () => undefined,
  markSalonMirror: () => undefined,
  notifySaveFailed: () => undefined,
  subscribeCloudUnavailable: () => () => undefined,
}))

vi.mock('../data/firebase/client', () => ({
  listenAppointments: async (uid: string, onData: (items: Appointment[], fromCache?: boolean) => void) => {
    mocks.appointmentListeners.set(uid, onData)
    return () => undefined
  },
  listenDogs: async (uid: string, onData: (items: Dog[], fromCache?: boolean) => void) => {
    mocks.dogListeners.set(uid, onData)
    return () => undefined
  },
  removeAppointment: vi.fn(async () => undefined),
  saveAppointment: vi.fn(async () => undefined),
  saveDog: vi.fn(async () => undefined),
}))

function visit(id: string): Appointment {
  return {
    id,
    dogId: 'rex',
    start: new Date(2026, 9, 21, 9, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'completato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

function rex(): Dog {
  return createDog('salone-a', {
    name: 'Rex',
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
  })
}

describe('cambio di account sulla stessa apertura', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.appointmentListeners.clear()
    mocks.dogListeners.clear()
  })

  it('le visite del salone precedente non restano in memoria', async () => {
    const { result, rerender } = renderHook(({ uid }) => useAppointments(uid), { initialProps: { uid: 'salone-a' } })
    await waitFor(() => expect(mocks.appointmentListeners.has('salone-a')).toBe(true))
    act(() => mocks.appointmentListeners.get('salone-a')!([visit('v1')], false))
    expect(result.current.appointments.map((item) => item.id)).toEqual(['v1'])
    rerender({ uid: 'salone-b' })
    expect(result.current.appointments).toEqual([])
    expect(result.current.synced).toBe(false)
  })

  it('i cani del salone precedente non restano in memoria', async () => {
    const { result, rerender } = renderHook(({ uid }) => useDogs(uid), { initialProps: { uid: 'salone-a' } })
    await waitFor(() => expect(mocks.dogListeners.has('salone-a')).toBe(true))
    const cane = rex()
    act(() => mocks.dogListeners.get('salone-a')!([cane], false))
    expect(result.current.dogs.map((item) => item.id)).toEqual([cane.id])
    rerender({ uid: 'salone-b' })
    expect(result.current.dogs).toEqual([])
  })
})
