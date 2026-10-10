// @vitest-environment happy-dom
import { Browser } from '@capacitor/browser'
import { LocalNotifications } from '@capacitor/local-notifications'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppInstaller } from '../lib/appInstaller'
import { RELEASE_CHECK_INTERVAL_MS } from '../lib/appRelease'
import { downloadLabel } from './UpdateNotice'
import { UpdateNotice } from './UpdateNotice'

const platform = vi.hoisted(() => ({ value: 'android' }))
const native = vi.hoisted(() => ({ value: false }))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform.value,
    isNativePlatform: () => native.value,
  },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
    createChannel: vi.fn(async () => undefined),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async () => undefined),
  },
}))

vi.mock('@capacitor/browser', () => ({
  Browser: { open: vi.fn() },
}))

vi.mock('../lib/appInstaller', () => ({
  AppInstaller: {
    downloadAndInstall: vi.fn(),
    installDownloaded: vi.fn(),
    cancel: vi.fn(),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}))

const release = { version: '9.0.0', url: 'https://github.com/robmass83-ui/Groomly/releases/download/v9.0.0/groomly.apk' }

describe('avviso di aggiornamento', () => {
  beforeEach(() => {
    platform.value = 'android'
    native.value = false
    vi.mocked(LocalNotifications.addListener).mockReset()
    vi.mocked(LocalNotifications.addListener).mockImplementation(async () => ({ remove: async () => {} }))
    vi.mocked(LocalNotifications.createChannel).mockClear()
    vi.mocked(LocalNotifications.requestPermissions).mockReset()
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'granted' })
    vi.mocked(LocalNotifications.schedule).mockClear()
    vi.mocked(Browser.open).mockClear()
    vi.mocked(AppInstaller.downloadAndInstall).mockReset()
    vi.mocked(AppInstaller.installDownloaded).mockReset()
    vi.mocked(AppInstaller.cancel).mockReset()
    vi.mocked(AppInstaller.addListener).mockReset()
    vi.mocked(AppInstaller.addListener).mockImplementation(async () => ({ remove: async () => {} }))
    vi.mocked(AppInstaller.cancel).mockResolvedValue()
  })

  it('calcola la percentuale intera e senza lunghezza dice Download…', () => {
    expect(downloadLabel(40, 100)).toBe('Download 40%')
    expect(downloadLabel(29, 100)).toBe('Download 29%')
    expect(downloadLabel(1, 3)).toBe('Download 33%')
    expect(downloadLabel(10, 0)).toBe('Download…')
  })

  it('su Android Scarica chiama il plugin e non il browser', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockResolvedValue({ opened: 'installer' })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(AppInstaller.downloadAndInstall).toHaveBeenCalledWith({ url: release.url })
    expect(Browser.open).not.toHaveBeenCalled()
  })

  it('il progresso cambia la scritta del bottone', async () => {
    const user = userEvent.setup()
    let progress: (event: { received: number; total: number }) => void = () => {}
    vi.mocked(AppInstaller.addListener).mockImplementation((async (event: string, listener: unknown) => {
      if (event === 'progress') progress = listener as typeof progress
      return { remove: async () => {} }
    }) as never)
    vi.mocked(AppInstaller.downloadAndInstall).mockImplementation(() => new Promise(() => {}))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    progress({ received: 40, total: 100 })
    expect(screen.getByRole('button', { name: 'Download 40%' })).toBeDisabled()
  })

  it('se il download fallisce mostra l’errore e Scarica riprova', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockRejectedValueOnce(new Error('rete'))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Download non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scarica' })).toBeEnabled()
  })

  it('senza permesso spiega il consenso e un secondo Scarica non riscarica', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockResolvedValue({ opened: 'settings' })
    vi.mocked(AppInstaller.installDownloaded).mockResolvedValue({ opened: 'settings' })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Per installare, consenti le app di Groomly')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(AppInstaller.downloadAndInstall).toHaveBeenCalledTimes(1)
    expect(AppInstaller.installDownloaded).toHaveBeenCalledTimes(1)
  })

  it('al ritorno con il permesso apre l’installazione senza un altro download', async () => {
    const user = userEvent.setup()
    let resume: (event: { opened: 'installer' | 'settings' }) => void = () => {}
    vi.mocked(AppInstaller.addListener).mockImplementation((async (event: string, listener: unknown) => {
      if (event === 'resume') resume = listener as typeof resume
      return { remove: async () => {} }
    }) as never)
    vi.mocked(AppInstaller.downloadAndInstall).mockResolvedValue({ opened: 'settings' })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Per installare, consenti le app di Groomly')).toBeInTheDocument()
    resume({ opened: 'installer' })
    expect(screen.queryByText('Per installare, consenti le app di Groomly')).not.toBeInTheDocument()
    expect(AppInstaller.downloadAndInstall).toHaveBeenCalledTimes(1)
  })

  it('fuori da Android apre il browser', async () => {
    platform.value = 'web'
    const user = userEvent.setup()
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(Browser.open).toHaveBeenCalledWith({ url: release.url })
    expect(AppInstaller.downloadAndInstall).not.toHaveBeenCalled()
  })

  it('non compare se la release è quella già installata e Più tardi chiude', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<UpdateNotice release={{ version: '1.1.5', url: 'https://github.com/apk' }} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<UpdateNotice release={{ version: '1.2.0', url: 'https://github.com/apk' }} />)
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(AppInstaller.cancel).not.toHaveBeenCalled()
  })

  it('Più tardi durante il download lo interrompe', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockImplementation(() => new Promise(() => {}))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(AppInstaller.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sul telefono avvisa una sola volta per ogni versione nuova', async () => {
    native.value = true
    const { rerender } = render(<UpdateNotice release={release} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1))
    const scheduled = vi.mocked(LocalNotifications.schedule).mock.calls[0][0].notifications[0]
    expect(scheduled).toMatchObject({
      id: 2,
      title: 'Aggiornamento disponibile',
      channelId: 'aggiornamenti',
    })
    expect(scheduled.body).toContain('9.0.0')
    rerender(<UpdateNotice release={release} />)
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1)
    rerender(<UpdateNotice release={{ ...release, version: '9.1.0' }} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(2))
  })

  it('se le notifiche sono negate il foglio resta e non programma l’avviso', async () => {
    native.value = true
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'denied' })
    render(<UpdateNotice release={release} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(LocalNotifications.requestPermissions).toHaveBeenCalled())
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('il tocco della notifica riapre l’avviso chiuso con Più tardi', async () => {
    native.value = true
    const user = userEvent.setup()
    let action: (event: { notification: { id: number } }) => void = () => {}
    vi.mocked(LocalNotifications.addListener).mockImplementation(async (event, listener) => {
      if (event === 'localNotificationActionPerformed') action = listener as typeof action
      return { remove: async () => {} }
    })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    action({ notification: { id: 1 } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    action({ notification: { id: 2 } })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('mentre l’app resta aperta un controllo successivo mostra l’avviso', async () => {
    const responses = [
      new Response('no', { status: 404 }),
      new Response('no', { status: 404 }),
      Response.json({
        tag_name: 'v9.0.0',
        assets: [{ name: 'groomly.apk', browser_download_url: release.url }],
      }),
    ]
    const previous = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async () => responses.shift() ?? new Response('no', { status: 404 })))
    vi.useFakeTimers()
    try {
      render(<UpdateNotice />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RELEASE_CHECK_INTERVAL_MS)
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/9\.0\.0/)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      vi.stubGlobal('fetch', previous)
    }
  })

  it('Più tardi resta chiuso finché non esce una versione successiva', async () => {
    const apk = { name: 'groomly.apk', browser_download_url: release.url }
    const responses = [
      Response.json({ tag_name: 'v9.0.0', assets: [apk] }),
      Response.json({ tag_name: 'v9.0.0', assets: [apk] }),
      Response.json({ tag_name: 'v9.1.0', assets: [apk] }),
    ]
    const previous = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async () => responses.shift() ?? new Response('no', { status: 404 })))
    vi.useFakeTimers()
    try {
      render(<UpdateNotice />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Più tardi' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RELEASE_CHECK_INTERVAL_MS)
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RELEASE_CHECK_INTERVAL_MS)
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/9\.1\.0/)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      vi.stubGlobal('fetch', previous)
    }
  })

  it('chiudere il foglio durante il download lo interrompe come Più tardi', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockImplementation(() => new Promise(() => {}))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(AppInstaller.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
