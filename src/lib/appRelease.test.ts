import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { APP_VERSION } from './appVersion'
import { fetchLatestRelease, isNewerVersion, releaseFromGithub, watchLatestRelease } from './appRelease'

describe('release GitHub', () => {
  it('considera più nuova solo una versione successiva', () => {
    expect(isNewerVersion('1.2.0', '1.1.0')).toBe(true)
    expect(isNewerVersion('v1.1.1', '1.1.0')).toBe(true)
    expect(isNewerVersion('1.1.0', '1.1.0')).toBe(false)
    expect(isNewerVersion('1.0.9', '1.1.0')).toBe(false)
    expect(isNewerVersion('bozza', '1.1.0')).toBe(false)
  })

  it('preferisce il file apk e altrimenti la pagina della release', () => {
    expect(releaseFromGithub({
      tag_name: 'v1.2.0',
      html_url: 'https://github.com/robmass83-ui/Groomly/releases/tag/v1.2.0',
      assets: [{ name: 'groomly-1.2.0.apk', browser_download_url: 'https://github.com/apk' }],
    })).toEqual({ version: '1.2.0', url: 'https://github.com/apk' })
    expect(releaseFromGithub({
      tag_name: 'v1.2.0',
      html_url: 'https://github.com/robmass83-ui/Groomly/releases/tag/v1.2.0',
      assets: [],
    })?.url).toBe('https://github.com/robmass83-ui/Groomly/releases/tag/v1.2.0')
    expect(releaseFromGithub(null)).toBeNull()
  })

  it('se GitHub è chiuso legge il file pubblico su Firebase', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('api.github.com')) return new Response('no', { status: 404 })
      return Response.json({ version: '1.2.0', url: 'https://groomly-3128b.web.app/groomly.apk' })
    })
    await expect(fetchLatestRelease(fetchImpl)).resolves.toEqual({
      version: '1.2.0',
      url: 'https://groomly-3128b.web.app/groomly.apk',
    })
  })

  it('resta in silenzio se nessuna fonte risponde', async () => {
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    await expect(fetchLatestRelease(offline)).resolves.toBeNull()
  })

  it('chiede la release senza riusare una risposta già in cache', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({
      tag_name: 'v1.2.0',
      assets: [{ name: 'groomly.apk', browser_download_url: 'https://github.com/apk' }],
    }))
    await fetchLatestRelease(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com'),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('ricontrolla subito, a intervallo e quando l’app torna visibile', async () => {
    const fetchRelease = vi.fn<typeof fetchLatestRelease>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ version: '1.2.0', url: 'https://github.com/apk' })
      .mockResolvedValueOnce({ version: '1.2.1', url: 'https://github.com/apk-2' })
      .mockResolvedValueOnce({ version: '1.3.0', url: 'https://github.com/apk-3' })
    let tick = () => {}
    const listeners = new Set<() => void>()
    const target = {
      visibilityState: 'visible' as DocumentVisibilityState,
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
    }
    const resumeTarget = new EventTarget()
    const seen: Array<string | null> = []
    const stop = watchLatestRelease((release) => {
      seen.push(release?.version ?? null)
    }, {
      fetchRelease,
      schedule: (run) => {
        tick = run
        return 1
      },
      cancel: () => {
        tick = () => {}
      },
      target,
      resumeTarget,
    })
    await vi.waitFor(() => expect(seen).toEqual([null]))
    tick()
    await vi.waitFor(() => expect(seen).toEqual([null, '1.2.0']))
    target.visibilityState = 'hidden'
    listeners.forEach((listener) => listener())
    expect(fetchRelease).toHaveBeenCalledTimes(2)
    target.visibilityState = 'visible'
    listeners.forEach((listener) => listener())
    await vi.waitFor(() => expect(seen).toEqual([null, '1.2.0', '1.2.1']))
    resumeTarget.dispatchEvent(new Event('groomlyResume'))
    await vi.waitFor(() => expect(seen).toEqual([null, '1.2.0', '1.2.1', '1.3.0']))
    stop()
    tick()
    listeners.forEach((listener) => listener())
    resumeTarget.dispatchEvent(new Event('groomlyResume'))
    expect(fetchRelease).toHaveBeenCalledTimes(4)
  })

  it('tiene allineate la versione dell’app, del pacchetto e di Android', () => {
    const root = process.cwd()
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { version: string }
    const hosted = JSON.parse(readFileSync(path.join(root, 'hosting', 'release.json'), 'utf8')) as { version: string }
    const gradle = readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8')
    const [major, minor, patch] = APP_VERSION.split('.').map(Number)
    expect(pkg.version).toBe(APP_VERSION)
    expect(hosted.version).toBe(APP_VERSION)
    expect(gradle).toContain(`versionName "${APP_VERSION}"`)
    expect(gradle).toContain(`versionCode ${major * 10000 + minor * 100 + patch}`)
  })
})
