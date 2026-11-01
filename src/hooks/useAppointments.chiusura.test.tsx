// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSessionAppointmentDeletions } from '../lib/tombstone'
import type { Appointment } from '../types/models'
import { useAppointments } from './useAppointments'

const mocks = vi.hoisted(() => ({
  appointmentListener: null as ((items: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void) | null,
  saveAppointment: vi.fn(async (..._args: unknown[]) => undefined),
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
  listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void) => {
    mocks.appointmentListener = onData
    return () => undefined
  },
  removeAppointment: vi.fn(async () => undefined),
  saveAppointment: (...args: unknown[]) => mocks.saveAppointment(...args),
}))

function ieri(): Appointment {
  const start = new Date()
  start.setDate(start.getDate() - 1)
  start.setHours(9, 0, 0, 0)
  return {
    id: 'v1',
    dogId: 'dog-1',
    kind: 'pelosetto',
    assigneeUid: 'collab-1',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

async function montato(partenza: Partial<Appointment> = {}) {
  const hook = renderHook(() => useAppointments('uid-1'))
  await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
  act(() => {
    mocks.appointmentListener?.([{ ...ieri(), ...partenza }], false)
  })
  mocks.saveAppointment.mockClear()
  return hook
}

async function salvatoCon(status: Appointment['status']): Promise<Appointment> {
  const trovato = () => mocks.saveAppointment.mock.calls.map((call) => call[1] as Appointment).filter((item) => item.status === status).pop()
  await waitFor(() => expect(trovato()).toBeDefined())
  return trovato() as Appointment
}

function inMemoria(hook: Awaited<ReturnType<typeof montato>>): Appointment {
  return hook.result.current.appointments.find((item) => item.id === 'v1') as Appointment
}

describe('chiusure di una visita nel hook', () => {
  beforeEach(() => {
    localStorage.clear()
    resetSessionAppointmentDeletions()
    mocks.appointmentListener = null
    mocks.saveAppointment.mockClear()
  })

  it('Completato tiene assigneeUid e kind e scrive chiusoIl', async () => {
    const hook = await montato()
    act(() => {
      expect(hook.result.current.complete('v1')).toBe(true)
    })
    for (const item of [await salvatoCon('completato'), inMemoria(hook)]) {
      expect(item).toMatchObject({ status: 'completato', assigneeUid: 'collab-1', kind: 'pelosetto' })
      expect(item.chiusoIl).toBeInstanceOf(Date)
    }
  })

  it('Salva e completa tiene assigneeUid e kind e scrive chiusoIl', async () => {
    const hook = await montato()
    act(() => {
      expect(hook.result.current.saveClose('v1', { total: 35, actualDurationMin: 45, adjustmentNote: 'x', paymentMethod: 'contanti' }, true)).toBe(true)
    })
    for (const item of [await salvatoCon('completato'), inMemoria(hook)]) {
      expect(item).toMatchObject({ status: 'completato', assigneeUid: 'collab-1', kind: 'pelosetto' })
      expect(item.chiusoIl).toBeInstanceOf(Date)
    }
  })

  it.each([
    ['non_venuto', undefined],
    ['disdetto', 'cliente'],
  ] as const)('Non venuto e Disdetto tengono assigneeUid e kind (%s)', async (status, motivo) => {
    const hook = await montato()
    act(() => {
      expect(hook.result.current.setStatus('v1', status, motivo)).toBe(true)
    })
    for (const item of [await salvatoCon(status), inMemoria(hook)]) {
      expect(item).toMatchObject({ status, assigneeUid: 'collab-1', kind: 'pelosetto' })
    }
  })

  it('annullare la disdetta dal toast riporta programmato con assigneeUid', async () => {
    const hook = await montato({ status: 'disdetto', cancelReason: 'cliente' })
    act(() => {
      expect(hook.result.current.setStatus('v1', 'programmato')).toBe(true)
    })
    for (const item of [await salvatoCon('programmato'), inMemoria(hook)]) {
      expect(item).toMatchObject({ status: 'programmato', assigneeUid: 'collab-1', kind: 'pelosetto' })
      expect(item.chiusoIl).toBeUndefined()
    }
  })
})
