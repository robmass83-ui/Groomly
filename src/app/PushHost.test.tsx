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
      return {
        remove: async () => {
          if (pushListeners.get(event) === listener) pushListeners.delete(event)
        },
      }
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

  it('stacca tutti i listener se la registrazione termina dopo lo smontaggio', async () => {
    const account = await createAccount('late@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })

    let resolveListeners!: () => void
    const listenersReady = new Promise<void>((resolve) => {
      resolveListeners = resolve
    })
    const pushRemoves: Array<ReturnType<typeof vi.fn>> = []
    const localRemoves: Array<ReturnType<typeof vi.fn>> = []

    vi.mocked(PushNotifications.addListener).mockImplementation(() => {
      const remove = vi.fn(async () => undefined)
      pushRemoves.push(remove)
      return listenersReady.then(() => ({ remove })) as ReturnType<typeof PushNotifications.addListener>
    })
    vi.mocked(LocalNotifications.addListener).mockImplementation(() => {
      const remove = vi.fn(async () => undefined)
      localRemoves.push(remove)
      return listenersReady.then(() => ({ remove })) as ReturnType<typeof LocalNotifications.addListener>
    })

    const view = render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.addListener).toHaveBeenCalled())
    view.unmount()

    await act(async () => {
      resolveListeners()
      await listenersReady
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(pushRemoves.length).toBeGreaterThan(0)
    expect(localRemoves.length).toBeGreaterThan(0)
    await waitFor(() => {
      pushRemoves.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1))
      localRemoves.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1))
    })
  })
})
