// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Appointment, AppointmentWrite } from '../types/models'
import { useAppointments } from './useAppointments'

const m = vi.hoisted(() => ({
  ascolta: null as ((items: Appointment[], fromCache?: boolean, cancellati?: readonly string[]) => void) | null,
  traccia: vi.fn(),
}))

vi.mock('./useSession', () => ({ useSession: () => ({ gate: { kind: 'out' } }) }))
vi.mock('../lib/metricheNative', () => ({ traccia: m.traccia }))
vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
  readsLocal: () => false,
  subscribeSource: () => () => undefined,
  markSalonMirror: () => undefined,
  notifySaveFailed: () => undefined,
  subscribeCloudUnavailable: () => () => undefined,
}))
vi.mock('../data/firebase/client', () => ({
  listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean, cancellati?: readonly string[]) => void) => {
    m.ascolta = onData
    return () => undefined
  },
  removeAppointment: vi.fn(async () => undefined),
  saveAppointment: vi.fn(async () => undefined),
}))

const VISITA = {
  dogId: 'd1',
  start: new Date(2026, 10, 10, 9, 0),
  plannedEnd: new Date(2026, 10, 10, 10, 0),
  services: [],
} as unknown as AppointmentWrite

function esistente(id: string, kind?: 'personale'): Appointment {
  return {
    id,
    ...(kind ? { kind, title: 'Dentista' } : {}),
    dogId: kind ? '' : 'd1',
    start: new Date(2026, 10, 9, 9, 0),
    plannedEnd: new Date(2026, 10, 9, 10, 0),
    services: [],
    status: 'programmato',
    createdAt: new Date(2026, 10, 1),
    updatedAt: new Date(2026, 10, 1),
  } as Appointment
}

async function apri(items: Appointment[]) {
  const vista = renderHook(() => useAppointments('u'))
  await waitFor(() => { expect(m.ascolta).not.toBeNull() })
  act(() => { m.ascolta?.(items, false, []) })
  await waitFor(() => { expect(vista.result.current.appointments).toHaveLength(items.length) })
  return vista
}

function nomi(): string[] {
  return m.traccia.mock.calls.map(([evento]) => (evento as { nome: string }).nome)
}

describe('eventi degli appuntamenti', () => {
  beforeEach(() => {
    localStorage.clear()
    m.ascolta = null
    m.traccia.mockClear()
  })

  it('la prima visita attiva il salone', async () => {
    const { result } = await apri([esistente('p', 'personale')])
    act(() => { result.current.saveNew(VISITA) })
    expect(nomi()).toEqual(['appuntamento_creato', 'salone_attivato'])
  })

  it('dalla seconda visita il salone è già attivo', async () => {
    const { result } = await apri([esistente('a')])
    act(() => { result.current.saveNew(VISITA) })
    expect(nomi()).toEqual(['appuntamento_creato'])
  })

  it('il cambio di stato segna completato e disdetto', async () => {
    const { result } = await apri([esistente('a'), esistente('b')])
    act(() => { result.current.setStatus('a', 'completato') })
    act(() => { result.current.setStatus('b', 'disdetto') })
    expect(nomi()).toEqual(['appuntamento_completato', 'appuntamento_disdetto'])
  })
})
