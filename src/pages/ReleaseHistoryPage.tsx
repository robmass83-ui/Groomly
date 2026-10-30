import { format } from 'date-fns'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { useEffect, useState } from 'react'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { nextReleasesUrl, publishedReleases, type PublishedRelease } from '../lib/appRelease'
import { APP_VERSION, RELEASE_REPO } from '../lib/appVersion'
import { IT_DATE } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'
import { AttesaRiga } from '../components/ui/Zampette'

const FIRST_RELEASES_URL = `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=100`

const fetchOptions: RequestInit = {
  cache: 'no-store',
  headers: { Accept: 'application/vnd.github+json' },
}

export function ReleaseHistoryPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [releases, setReleases] = useState<PublishedRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setNextUrl(null)
    setReleases([])
    void (async () => {
      try {
        const response = await fetch(FIRST_RELEASES_URL, fetchOptions)
        if (cancelled) return
        if (!response.ok) {
          setError(true)
          setLoading(false)
          return
        }
        let payload: unknown
        try {
          payload = await response.json()
        } catch {
          setError(true)
          setLoading(false)
          return
        }
        setReleases(publishedReleases(payload))
        setNextUrl(nextReleasesUrl(response.headers.get('Link')))
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function loadMore() {
    if (!nextUrl || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await fetch(nextUrl, fetchOptions)
      if (!response.ok) return
      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        return
      }
      setReleases((current) => [...current, ...publishedReleases(payload)])
      setNextUrl(nextReleasesUrl(response.headers.get('Link')))
    } catch {
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <ShellFrame showFab={false}>
      <Header title={frasi.relTitolo} subtitle={t(lingua, 'relInstallataVer', { versione: APP_VERSION })} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {loading ? <AttesaRiga testo={frasi.relCaricamento} /> : null}
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <p style={{ margin: 0, color: 'var(--tx2)', ...USER_TEXT }}>{frasi.relKo}</p>
            <Button style={{ minHeight: 44 }} onClick={() => setAttempt((value) => value + 1)}>{frasi.relRiprova}</Button>
          </div>
        ) : null}
        {!loading && !error ? (
          <>
            {releases.map((release) => (
              <ReleaseBlock key={`${release.version}-${release.publishedAt.toISOString()}`} release={release} />
            ))}
            {nextUrl ? (
              <Button
                variant="secondary"
                style={{ minHeight: 44, alignSelf: 'stretch' }}
                disabled={loadingMore}
                aria-busy={loadingMore || undefined}
                onClick={() => { void loadMore() }}
              >
                {frasi.relPrecedenti}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </ShellFrame>
  )
}

function ReleaseBlock({ release }: { release: PublishedRelease }) {
  const frasi = useFrasi()
  const installed = release.version === APP_VERSION
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: TYPE.base }}>{release.version}</span>
        <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>
          {format(release.publishedAt, 'd MMM yyyy', IT_DATE)}
        </span>
        {installed ? (
          <span style={{ color: 'var(--tx2)', fontSize: TYPE.meta, fontWeight: 600 }}>{frasi.relQuesta}</span>
        ) : null}
      </div>
      {release.notes.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--tx2)', ...USER_TEXT }}>{frasi.relNessunaNota}</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {release.notes.map((note) => (
            <li key={note} style={{ color: 'var(--tx2)', ...USER_TEXT }}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
