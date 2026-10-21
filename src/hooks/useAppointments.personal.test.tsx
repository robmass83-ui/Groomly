// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAppointments } from '../data/local/appointments'
import { storageKeys } from '../data/local/storage'
import type { Appointment } from '../types/models'
import { useAppointments } from './useAppointments'

const mocks = vi.hoisted(() => ({
  appointmentListener: null as ((items: Appointment[], fromCache?: boolean) => void) | null,
  removeAppointment: vi.fn(async (..._args: unknown[]) => undefined),
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
}))

vi.mock('../data/firebase/client', () => ({
  listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean) => void) => {
    mocks.appointmentListener = onData
    return () => undefined
  },
  removeAppointment: (...args: unknown[]) => mocks.removeAppointment(...args),
  saveAppointment: vi.fn(async () => undefined),
}))

function personal(): Appointment {
  return {
    id: 'p1',
    kind: 'personale',
    title: 'Dentista',
    dogId: '',
    start: new Date(2026, 9, 21, 18, 0),
    plannedEnd: new Date(2026, 9, 21, 19, 0),
    services: [],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

function visit(id: string, dogId: string): Appointment {
  return {
    id,
    dogId,
    start: new Date(2026, 9, 21, 9, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

describe('appuntamento personale nel hook', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.appointmentListener = null
    mocks.removeAppointment.mockClear()
  })

  it('dopo lo snapshot un personale resta personale e una visita senza kind non lo inventa', async () => {
    renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => {
      mocks.appointmentListener?.([personal(), visit('v1', 'dog-1')], false)
    })

    const kept = listAppointments('uid-1').find((item) => item.id === 'p1')
    expect(kept).toMatchObject({ kind: 'personale', title: 'Dentista' })
    expect(kept?.plannedEnd).toEqual(new Date(2026, 9, 21, 19, 0))

    const raw = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, { kind?: string }>
    expect(raw.v1.kind).toBeUndefined()
  })

  it('non passa un personale alla cancellazione quando i cani sono noti e il dog id è vuoto', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => {
      mocks.appointmentListener?.([personal(), visit('gone', 'missing-dog'), visit('live', 'dog-1')], false)
    })

    act(() => {
      result.current.dropMissing(new Set(['dog-1']), new Set(['p1', 'gone', 'live']))
    })

    await waitFor(() => expect(mocks.removeAppointment).toHaveBeenCalled())
    const deleted = mocks.removeAppointment.mock.calls.map((call) => call[1])
    expect(deleted).toContain('gone')
    expect(deleted).not.toContain('p1')
    expect(result.current.appointments.map((item) => item.id)).toContain('p1')
    expect(listAppointments('uid-1').map((item) => item.id)).toContain('p1')
  })
})
