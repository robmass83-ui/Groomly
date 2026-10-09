// @vitest-environment happy-dom
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAccount, getAccount, logout } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { storageKeys, writeJson } from '../data/local/storage'
import { useSession } from '../hooks/useSession'
import type { DogWrite } from '../types/models'
import { Providers } from './providers'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    createChannel: vi.fn(async () => undefined),
    schedule: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
  },
}))

function dog(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'mensile',
    contact: { name: '', phone: '333' },
  }
}

function lastScheduledBody(): string | undefined {
  const calls = vi.mocked(LocalNotifications.schedule).mock.calls
  return calls.at(-1)?.[0].notifications[0]?.body
}

function AccountButtons() {
  const session = useSession()
  return (
    <>
      <button type="button" onClick={() => session.login('maria@salone.it', 'segretissimo')}>Entra</button>
      <button type="button" onClick={() => session.logout()}>Esci</button>
    </>
  )
}

describe('promemoria mensile', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(Capacitor.isNativePlatform).mockReset()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(LocalNotifications.schedule).mockClear()
    vi.mocked(LocalNotifications.cancel).mockClear()
    vi.mocked(LocalNotifications.createChannel).mockClear()
    vi.mocked(LocalNotifications.addListener).mockClear()
  })

  it('a freddo, già dentro, programma i cani di quell’account', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Toby'))
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    render(<Providers><span>app</span></Providers>)
    await waitFor(() => expect(lastScheduledBody()).toContain('Toby'))
  })

  it('dopo l’accesso programma i cani dell’account e non annulla sulla lista vuota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Toby'))
    logout()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const user = userEvent.setup()
    render(<Providers><AccountButtons /></Providers>)
    await waitFor(() => expect(LocalNotifications.cancel).toHaveBeenCalled())
    const scheduledBefore = vi.mocked(LocalNotifications.schedule).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    await waitFor(() => {
      expect(vi.mocked(LocalNotifications.schedule).mock.calls.length).toBeGreaterThan(scheduledBefore)
      expect(lastScheduledBody()).toContain('Toby')
    }, { timeout: 8000 })
  })

  it('dopo il cambio di uid programma i cani del nuovo account', async () => {
    const first = await createAccount('maria@salone.it', 'segretissimo')
    createDog(first.uid, dog('Toby'))
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const user = userEvent.setup()
    render(<Providers><AccountButtons /></Providers>)
    await waitFor(() => expect(lastScheduledBody()).toContain('Toby'))
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    await waitFor(() => expect(LocalNotifications.cancel).toHaveBeenCalled())
    const stored = getAccount()
    if (!stored) throw new Error('account assente')
    const nextUid = 'uid-kira'
    writeJson(storageKeys.auth, { ...stored, uid: nextUid })
    createDog(nextUid, dog('Kira'))
    const scheduledBefore = vi.mocked(LocalNotifications.schedule).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    await waitFor(() => {
      expect(vi.mocked(LocalNotifications.schedule).mock.calls.length).toBeGreaterThan(scheduledBefore)
      expect(lastScheduledBody()).toContain('Kira')
    }, { timeout: 8000 })
    expect(lastScheduledBody()).not.toContain('Toby')
  })

  it('fuori dal nativo non chiama le notifiche locali', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Toby'))
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    render(<Providers><span>app</span></Providers>)
    await Promise.resolve()
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
    expect(LocalNotifications.cancel).not.toHaveBeenCalled()
    expect(LocalNotifications.createChannel).not.toHaveBeenCalled()
    expect(LocalNotifications.addListener).not.toHaveBeenCalled()
  })
})
