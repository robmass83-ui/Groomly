// @vitest-environment happy-dom
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Appointment } from '../types/models'
import { Providers } from './providers'

const mocks = vi.hoisted(() => ({
  appointmentListener: null as ((items: Appointment[], fromCache?: boolean) => void) | null,
  removeAppointment: vi.fn(async (..._args: unknown[]) => undefined),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  WebPlugin: class {},
  registerPlugin: () => ({}),
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {},
}))

vi.mock('../hooks/useSession', () => ({
  SessionProvider: ({ children }: { children: unknown }) => children,
  useSession: () => ({
    gate: { kind: 'in', account: { uid: 'uid-1' } },
    entry: { kind: 'home' },
  }),
}))

vi.mock('../hooks/useDogs', () => ({
  useDogs: () => ({ dogs: [], settled: true }),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
  readsLocal: () => false,
  subscribeSource: () => () => undefined,
  markSalonMirror: () => undefined,
  notifySaveFailed: () => undefined,
  subscribeSaveFailed: () => () => undefined,
  subscribeCloudUnavailable: () => () => undefined,
}))

vi.mock('../data/firebase/client', () => ({
  listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean) => void) => {
    mocks.appointmentListener = onData
    return () => undefined
  },
  removeAppointment: (...args: unknown[]) => mocks.removeAppointment(...args),
  saveAppointment: vi.fn(async () => undefined),
}))

vi.mock('./CompleanniAvviso', () => ({ CompleanniAvviso: () => null }))
vi.mock('./OrarioScadutoAvviso', () => ({ OrarioScadutoAvviso: () => null }))
vi.mock('./DriveInvioAuto', () => ({ DriveInvioAuto: () => null }))
vi.mock('../hooks/useSettings', async () => {
  const real = await vi.importActual<typeof import('../hooks/useSettings')>('../hooks/useSettings')
  return {
    ...real,
    SettingsProvider: ({ children }: { children: unknown }) => children,
    useSettings: () => ({
      settings: { monthlyReminder: { enabled: false, time: '18:30', daysBefore: 0 } },
      reload: () => undefined,
    }),
  }
})
vi.mock('../hooks/usePiano', () => ({
  PianoProvider: ({ children }: { children: unknown }) => children,
  usePiano: () => ({ pronto: false, stato: null }),
}))
vi.mock('../components/beta/BetaProvider', () => ({
  BetaProvider: ({ children }: { children: unknown }) => children,
}))
vi.mock('../i18n/LinguaContext', () => ({
  LinguaProvider: ({ children }: { children: unknown }) => children,
  useFrasi: () => ({ authSalvataggio: '' }),
}))
vi.mock('../components/layout/Toast', () => ({
  ToastProvider: ({ children }: { children: unknown }) => children,
  useToast: () => ({ show: () => undefined }),
}))

function futureVisit(id: string, dogId: string): Appointment {
  return {
    id,
    dogId,
    start: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

describe('avvio dell’app', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.appointmentListener = null
    mocks.removeAppointment.mockClear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('all avvio con la lista cani vuota nessuna visita viene cancellata', async () => {
    render(<Providers><span>app</span></Providers>)
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => {
      mocks.appointmentListener?.([futureVisit('v1', 'dog-1'), futureVisit('v2', 'dog-2'), futureVisit('v3', 'dog-3')], false)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(mocks.removeAppointment).not.toHaveBeenCalled()
  })
})
