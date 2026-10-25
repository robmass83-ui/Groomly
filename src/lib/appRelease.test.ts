import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { APP_VERSION } from './appVersion'
import {
  fetchLatestRelease,
  isNewerVersion,
  nextReleasesUrl,
  notesFromHistory,
  notesFromRelease,
  publishedReleases,
  releaseFromGithub,
  watchLatestRelease,
} from './appRelease'

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
    })).toEqual({ version: '1.2.0', url: 'https://github.com/apk', notes: [] })
    expect(releaseFromGithub({
      tag_name: 'v1.2.0',
      html_url: 'https://github.com/robmass83-ui/Groomly/releases/tag/v1.2.0',
      assets: [],
    })?.url).toBe('https://github.com/robmass83-ui/Groomly/releases/tag/v1.2.0')
    expect(releaseFromGithub(null)).toBeNull()
  })

  it('notesFromHistory non limita a sei righe', () => {
    expect(notesFromHistory('Uno\n- Due\nhttps://esempio.test\nTre\nQuattro\nCinque\nSei\nSette')).toEqual([
      'Uno', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette',
    ])
  })

  it('publishedReleases scarta bozze e ordina per data', () => {
    expect(publishedReleases([
      { tag_name: 'v1.1.0', draft: true, published_at: '2026-10-02T00:00:00Z', body: 'Bozza' },
      { tag_name: 'v1.1.1', prerelease: true, published_at: '2026-10-03T00:00:00Z', body: 'Anteprima' },
      { tag_name: 'v1.0.0', published_at: '2026-10-01T00:00:00Z', body: 'Prima' },
      { tag_name: 'v1.2.0', published_at: '2026-10-04T00:00:00Z', body: '- Seconda' },
    ])).toMatchObject([
      { version: '1.2.0', notes: ['Seconda'] },
      { version: '1.0.0', notes: ['Prima'] },
    ])
  })

  it('nextReleasesUrl legge rel next dall’header Link', () => {
    expect(nextReleasesUrl('<https://api.github.com/repos/robmass83-ui/Groomly/releases?page=2>; rel="next"')).toBe(
      'https://api.github.com/repos/robmass83-ui/Groomly/releases?page=2',
    )
    expect(nextReleasesUrl(null)).toBeNull()
  })

  it('tiene poche righe di novità, dal testo o da un elenco', () => {
    expect(notesFromRelease('Prima novità\n- Seconda novità\nhttps://esempio.test\n# Titolo')).toEqual([
      'Prima novità',
      'Seconda novità',
      'Titolo',
    ])
    expect(releaseFromGithub({
      tag_name: 'v1.2.0',
      body: 'Un mensile non crea da solo la visita successiva.',
      assets: [{ name: 'groomly.apk', browser_download_url: 'https://github.com/apk' }],
    })?.notes).toEqual(['Un mensile non crea da solo la visita successiva.'])
  })

  it('legge prima groomlyapp.it e non chiede GitHub se l’hosting risponde', async () => {
    const urls: string[] = []
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('groomlyapp.it/release.json')) {
        return Response.json({ version: '1.2.0', url: 'https://groomlyapp.it/groomly.apk', notes: ['Nota'] })
      }
      return new Response('no', { status: 404 })
    })
    await expect(fetchLatestRelease(fetchImpl)).resolves.toEqual({
      version: '1.2.0',
      url: 'https://groomlyapp.it/groomly.apk',
      notes: ['Nota'],
    })
    expect(urls[0]).toContain('groomlyapp.it/release.json')
    expect(urls.some((url) => url.includes('api.github.com'))).toBe(false)
  })

  it('se l’hosting tace usa GitHub e, se anche quello tace, web.app', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('groomlyapp.it')) return new Response('no', { status: 404 })
      if (url.includes('api.github.com')) return new Response('no', { status: 404 })
      if (url.includes('web.app/release.json')) {
        return Response.json({ version: '1.2.0', url: 'https://groomly-3128b.web.app/groomly.apk' })
      }
      return new Response('no', { status: 404 })
    })
    await expect(fetchLatestRelease(fetchImpl)).resolves.toEqual({
      version: '1.2.0',
      url: 'https://groomly-3128b.web.app/groomly.apk',
      notes: [],
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
      expect.stringContaining('groomlyapp.it/release.json'),
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

  it('accoda un controllo arrivato mentre quello precedente è in corso', async () => {
    let resolveFirst: (release: Awaited<ReturnType<typeof fetchLatestRelease>>) => void = () => {}
    const fetchRelease = vi.fn<typeof fetchLatestRelease>()
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve
      }))
      .mockResolvedValueOnce(null)
    const resumeTarget = new EventTarget()
    const stop = watchLatestRelease(() => {}, {
      fetchRelease,
      schedule: () => 1,
      cancel: () => {},
      target: {
        visibilityState: 'visible',
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      resumeTarget,
    })

    expect(fetchRelease).toHaveBeenCalledTimes(1)
    resumeTarget.dispatchEvent(new Event('groomlyResume'))
    expect(fetchRelease).toHaveBeenCalledTimes(1)

    resolveFirst(null)
    await vi.waitFor(() => expect(fetchRelease).toHaveBeenCalledTimes(2))
    stop()
  })

  it('tiene allineate la versione dell’app, del pacchetto e di Android', () => {
    const root = process.cwd()
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { version: string }
    const hosted = JSON.parse(readFileSync(path.join(root, 'hosting', 'release.json'), 'utf8')) as { version: string }
    const gradle = readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8')
    const [major, minor, patch] = APP_VERSION.split('.').map(Number)
    expect(pkg.version).toBe(APP_VERSION)
    expect(gradle).toContain(`versionName "${APP_VERSION}"`)
    expect(gradle).toContain(`versionCode ${major * 10000 + minor * 100 + patch}`)
    if (hosted.version === APP_VERSION) return
    const prepared = JSON.parse(
      readFileSync(path.join(root, 'docs', 'play', `release-${APP_VERSION}.json`), 'utf8'),
    ) as { version: string }
    expect(prepared.version).toBe(APP_VERSION)
    expect(isNewerVersion(APP_VERSION, hosted.version)).toBe(true)
  })
})
