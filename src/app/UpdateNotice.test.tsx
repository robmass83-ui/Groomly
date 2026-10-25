// @vitest-environment happy-dom
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { LocalNotifications } from '@capacitor/local-notifications'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppInstaller } from '../lib/appInstaller'
import { RELEASE_CHECK_INTERVAL_MS } from '../lib/appRelease'
import { shouldScheduleLocalUpdate } from '../lib/pushDevice'
import { downloadLabel } from './UpdateNotice'
import { UpdateNotice } from './UpdateNotice'

const platform = vi.hoisted(() => ({ value: 'android' }))
const native = vi.hoisted(() => ({ value: false }))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}))

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
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
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

vi.mock('../lib/pushDevice', () => ({
  shouldScheduleLocalUpdate: vi.fn(() => true),
}))

const release = { version: '9.0.0', url: 'https://github.com/robmass83-ui/Groomly/releases/download/v9.0.0/groomly.apk' }

function manca(): Response {
  return new Response('no', { status: 404 })
}

function versioneGithub(version: string): Response {
  return Response.json({
    tag_name: `v${version}`,
    assets: [{ name: 'groomly.apk', browser_download_url: release.url }],
  })
}

/** Un controllo legge release.json, poi GitHub, poi Firebase solo se i primi due non rispondono. */
function controllo(version: string | null): Response[] {
  if (!version) return [manca(), manca(), manca()]
  return [manca(), versioneGithub(version)]
}

describe('avviso di aggiornamento', () => {
  beforeEach(() => {
    platform.value = 'android'
    native.value = false
    vi.mocked(App.addListener).mockReset()
    vi.mocked(App.addListener).mockImplementation(async () => ({ remove: async () => {} }))
    vi.mocked(LocalNotifications.addListener).mockReset()
    vi.mocked(LocalNotifications.addListener).mockImplementation(async () => ({ remove: async () => {} }))
    vi.mocked(LocalNotifications.createChannel).mockClear()
    vi.mocked(LocalNotifications.checkPermissions).mockReset()
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: 'granted' })
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
    vi.mocked(shouldScheduleLocalUpdate).mockReset()
    vi.mocked(shouldScheduleLocalUpdate).mockReturnValue(true)
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
    render(<UpdateNotice release={{ ...release, notes: ['Un mensile non crea da solo la visita successiva.'] }} />)
    const dialog = screen.getByRole('dialog', { name: 'Vuoi aggiornare adesso?' })
    expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(screen.getByText('È pronta la versione 9.0.0.')).toBeInTheDocument()
    expect(screen.getByText('Un mensile non crea da solo la visita successiva.')).toBeInTheDocument()
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
    rerender(<UpdateNotice release={{ version: '1.2.0', url: 'https://github.com/apk' }} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<UpdateNotice release={{ version: '1.3.0', url: 'https://github.com/apk-2' }} />)
    expect(screen.getByRole('dialog', { name: 'Vuoi aggiornare adesso?' })).toBeInTheDocument()
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
    const firstRelease = { ...release, version: '9.2.0' }
    const { rerender } = render(<UpdateNotice release={firstRelease} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1))
    const scheduled = vi.mocked(LocalNotifications.schedule).mock.calls[0][0].notifications[0]
    expect(scheduled).toMatchObject({
      id: 2,
      title: 'Aggiornamento disponibile',
      body: 'È pronta la versione 9.2.0.',
      channelId: 'aggiornamenti',
    })
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled()
    rerender(<UpdateNotice release={firstRelease} />)
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1)
    rerender(<UpdateNotice release={{ ...release, version: '9.3.0' }} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(2))
  })

  it('non programma l’avviso locale quando la push aggiornamenti è pronta', async () => {
    native.value = true
    localStorage.setItem('groomly.pushUpdatesReady', '1')
    vi.mocked(shouldScheduleLocalUpdate).mockReturnValue(false)

    render(<UpdateNotice release={{ ...release, version: '9.2.1' }} />)

    await waitFor(() => expect(shouldScheduleLocalUpdate).toHaveBeenCalledWith(true, true))
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('non avvisa di nuovo una versione già annunciata dopo una versione successiva', async () => {
    native.value = true
    const firstRelease = { ...release, version: '9.10.0' }
    const { rerender } = render(<UpdateNotice release={firstRelease} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1))

    rerender(<UpdateNotice release={{ ...release, version: '9.11.0' }} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(2))

    await act(async () => {
      rerender(<UpdateNotice release={firstRelease} />)
    })
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(2)
  })

  it('Più tardi e la notifica restano memorizzati dopo un rimontaggio', async () => {
    native.value = true
    const user = userEvent.setup()
    const sameRelease = { ...release, version: '9.4.0' }
    const first = render(<UpdateNotice release={sameRelease} />)
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    first.unmount()

    render(<UpdateNotice release={sameRelease} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1))
  })

  it('se le notifiche sono negate il foglio resta e non programma l’avviso', async () => {
    native.value = true
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: 'denied' })
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'denied' })
    const deniedRelease = { ...release, version: '9.5.0' }
    const { rerender } = render(<UpdateNotice release={deniedRelease} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(LocalNotifications.requestPermissions).toHaveBeenCalled())
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
    rerender(<UpdateNotice release={{ ...release, version: '9.6.0' }} />)
    expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1)
  })

  it('il tocco della notifica riapre l’avviso chiuso con Più tardi', async () => {
    native.value = true
    const user = userEvent.setup()
    let action: (event: { notification: { id: number } }) => void = () => {}
    vi.mocked(LocalNotifications.addListener).mockImplementation(async (event, listener) => {
      if (event === 'localNotificationActionPerformed') action = listener as typeof action
      return { remove: async () => {} }
    })
    render(<UpdateNotice release={{ ...release, version: '9.7.0' }} />)
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    action({ notification: { id: 1 } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    action({ notification: { id: 2 } })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('il tocco della notifica riapre l’avviso dopo un rimontaggio', async () => {
    native.value = true
    const user = userEvent.setup()
    let action: (event: { notification: { id: number } }) => void = () => {}
    vi.mocked(LocalNotifications.addListener).mockImplementation(async (event, listener) => {
      if (event === 'localNotificationActionPerformed') action = listener as typeof action
      return { remove: async () => {} }
    })
    const remountedRelease = { ...release, version: '9.8.0' }
    const first = render(<UpdateNotice release={remountedRelease} />)
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    first.unmount()

    render(<UpdateNotice release={remountedRelease} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    action({ notification: { id: 1 } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    action({ notification: { id: 2 } })
    expect(screen.getByRole('dialog', { name: 'Vuoi aggiornare adesso?' })).toBeInTheDocument()
    expect(screen.getByText('È pronta la versione 9.8.0.')).toBeInTheDocument()
  })

  it('mentre l’app resta aperta un controllo successivo mostra l’avviso', async () => {
    const responses = [...controllo(null), ...controllo('9.0.0')]
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

  it('quando Capacitor torna attivo scatena un nuovo controllo', async () => {
    native.value = true
    let appStateChange: (state: { isActive: boolean }) => void = () => {}
    vi.mocked(App.addListener).mockImplementation(async (event, listener) => {
      if (String(event) === 'appStateChange') appStateChange = listener as unknown as typeof appStateChange
      return { remove: async () => {} }
    })
    const responses = [...controllo('9.0.0'), ...controllo('9.1.0')]
    const fetchImpl = vi.fn(async () => responses.shift() ?? manca())
    vi.stubGlobal('fetch', fetchImpl)
    try {
      render(<UpdateNotice />)
      expect(await screen.findByText('È pronta la versione 9.0.0.')).toBeInTheDocument()
      appStateChange({ isActive: false })
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      appStateChange({ isActive: true })
      expect(await screen.findByText('È pronta la versione 9.1.0.')).toBeInTheDocument()
      expect(fetchImpl).toHaveBeenCalledTimes(4)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('rimuove il listener app anche se viene registrato dopo lo smontaggio', async () => {
    native.value = true
    let resolveHandle: ((handle: { remove: () => Promise<void> }) => void) | undefined
    const remove = vi.fn(async () => {})
    vi.mocked(App.addListener).mockReturnValue(new Promise((resolve) => {
      resolveHandle = resolve
    }))
    const view = render(<UpdateNotice release={{ ...release, version: '9.8.0' }} />)

    view.unmount()
    await act(async () => {
      resolveHandle?.({ remove })
      await Promise.resolve()
    })

    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('Più tardi resta chiuso finché non esce una versione successiva', async () => {
    const responses = [...controllo('9.0.0'), ...controllo('9.0.0'), ...controllo('9.1.0')]
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
    render(<UpdateNotice release={{ ...release, version: '9.9.0' }} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(AppInstaller.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
