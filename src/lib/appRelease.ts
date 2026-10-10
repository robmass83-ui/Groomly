import { RELEASE_REPO } from './appVersion'

export const FIREBASE_RELEASE_URL = 'https://groomly-3128b.web.app/release.json'

export type AppRelease = { version: string; url: string; notes?: string[] }

export function notesFromRelease(value: unknown): string[] {
  const lines = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? value.split(/\r?\n/)
      : []
  const notes: string[] = []
  for (const line of lines) {
    const clean = line.replace(/^[-*•]\s*/, '').replace(/^#+\s*/, '').trim()
    if (!clean || /^https?:\/\//i.test(clean)) continue
    notes.push(clean)
    if (notes.length === 6) break
  }
  return notes
}

export function parseVersion(value: string): [number, number, number] | null {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i.exec(value.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)]
}

export function isNewerVersion(remote: string, local: string): boolean {
  const next = parseVersion(remote)
  const current = parseVersion(local)
  if (!next || !current) return false
  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== current[index]) return next[index] > current[index]
  }
  return false
}

export function releaseFromGithub(payload: unknown): AppRelease | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as { tag_name?: unknown; html_url?: unknown; assets?: unknown }
  if (typeof body.tag_name !== 'string') return null
  const version = body.tag_name.replace(/^v/i, '')
  if (!parseVersion(version)) return null
  const assets = Array.isArray(body.assets) ? body.assets : []
  const apk = assets.find((item) => {
    if (!item || typeof item !== 'object') return false
    const name = (item as { name?: unknown }).name
    const url = (item as { browser_download_url?: unknown }).browser_download_url
    return typeof name === 'string' && name.toLowerCase().endsWith('.apk') && typeof url === 'string' && url.length > 0
  }) as { browser_download_url: string } | undefined
  const page = typeof body.html_url === 'string' ? body.html_url : ''
  const url = apk?.browser_download_url || page
  if (!url) return null
  const source = body as { body?: unknown }
  return { version, url, notes: notesFromRelease(source.body) }
}

export function releaseFromDocument(payload: unknown): AppRelease | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as { version?: unknown; url?: unknown; notes?: unknown }
  if (typeof body.version !== 'string' || typeof body.url !== 'string') return null
  if (!parseVersion(body.version) || !body.url.startsWith('https://')) return null
  return { version: body.version.replace(/^v/i, ''), url: body.url, notes: notesFromRelease(body.notes) }
}

async function readJson(fetchImpl: typeof fetch, url: string): Promise<unknown | null> {
  try {
    const response = await fetchImpl(url, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchLatestRelease(fetchImpl: typeof fetch = fetch): Promise<AppRelease | null> {
  const github = releaseFromGithub(await readJson(fetchImpl, `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`))
  if (github) return github
  return releaseFromDocument(await readJson(fetchImpl, FIREBASE_RELEASE_URL))
}

export const RELEASE_CHECK_INTERVAL_MS = 60_000

type ReleaseWatchTarget = {
  visibilityState: DocumentVisibilityState
  addEventListener: (type: 'visibilitychange', listener: () => void) => void
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void
}

export function watchLatestRelease(
  onRelease: (release: AppRelease | null) => void,
  deps: {
    fetchRelease?: typeof fetchLatestRelease
    intervalMs?: number
    target?: ReleaseWatchTarget
    schedule?: (run: () => void, ms: number) => number
    cancel?: (id: number) => void
    resumeTarget?: EventTarget
  } = {},
): () => void {
  const fetchRelease = deps.fetchRelease ?? fetchLatestRelease
  const intervalMs = deps.intervalMs ?? RELEASE_CHECK_INTERVAL_MS
  const target = deps.target ?? document
  const resumeTarget = deps.resumeTarget ?? window
  const schedule = deps.schedule ?? ((run, ms) => window.setInterval(run, ms))
  const cancel = deps.cancel ?? ((id) => window.clearInterval(id))
  let live = true
  let pending = false
  const check = () => {
    if (!live || pending) return
    pending = true
    void fetchRelease().then(
      (release) => {
        pending = false
        if (live) onRelease(release)
      },
      () => {
        pending = false
      },
    )
  }
  check()
  const id = schedule(check, intervalMs)
  const onVisible = () => {
    if (target.visibilityState === 'visible') check()
  }
  target.addEventListener('visibilitychange', onVisible)
  const onResume = () => check()
  resumeTarget.addEventListener('groomlyResume', onResume)
  return () => {
    live = false
    cancel(id)
    target.removeEventListener('visibilitychange', onVisible)
    resumeTarget.removeEventListener('groomlyResume', onResume)
  }
}
