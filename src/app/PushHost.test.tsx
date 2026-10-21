// @vitest-environment happy-dom
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAccount } from '../data/local/auth'
import { savePushPrefs } from '../data/pushPrefs'
import { Providers } from './providers'
import { PushHost } from './PushHost'

const pushListeners = vi.hoisted(() => new Map<string, (event: any) => void>())

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
  },
}))

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    addListener: vi.fn(async (event: string, listener: (payload: any) => void) => {
      pushListeners.set(event, listener)
      return { remove: async () => pushListeners.delete(event) }
    }),
    createChannel: vi.fn(async () => undefined),
    checkPermissions: vi.fn(async () => ({ receive: 'granted' })),
    requestPermissions: vi.fn(async () => ({ receive: 'granted' })),
    register: vi.fn(async () => undefined),
  },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
    cancel: vi.fn(async () => undefined),
    createChannel: vi.fn(async () => undefined),
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async () => undefined),
  },
}))

vi.mock('../data/firebase/client', () => ({
  writePushDevice: vi.fn(async () => undefined),
}))

function Path() {
  return <p>{useLocation().pathname}</p>
}

describe('PushHost', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    pushListeners.clear()
    vi.clearAllMocks()
  })

  it('apre un appuntamento da una push completa senza montare la pagina Notifiche', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })

    render(
      <Providers>
        <MemoryRouter initialEntries={['/']}>
          <PushHost />
          <Routes>
            <Route path="*" element={<Path />} />
          </Routes>
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    expect(screen.getByText('/')).toBeInTheDocument()

    await act(async () => {
      pushListeners.get('pushNotificationActionPerformed')?.({
        notification: {
          data: { type: 'complete', appointmentId: 'a1', url: '/appuntamenti/a1' },
        },
      })
    })

    expect(screen.getByText('/appuntamenti/a1')).toBeInTheDocument()
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })
})
