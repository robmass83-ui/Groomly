import { useEffect, useMemo, useState } from 'react'
import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { readSignInHint } from '../data/local/signInHint'
import { useSession } from '../hooks/useSession'
import { greetingText } from '../lib/greeting'
import { Providers } from './providers'
import { buildRoutes } from './router'
import { prepareBrowserHistory, sheetEntries } from './sheetHistory'
import { UpdateNotice } from './UpdateNotice'
import { LoadingSplash } from './LoadingSplash'

/** Tempo minimo della schermata di caricamento: la scritta Groomly si compone e il saluto resta leggibile. */
const SPLASH_MIN_MS = 3600
const SPLASH_FADE_MS = 350

function useSplash(enabled: boolean, ready: boolean): 'show' | 'leaving' | 'done' {
  const [minElapsed, setMinElapsed] = useState(!enabled)
  const [done, setDone] = useState(!enabled)
  useEffect(() => {
    if (!enabled) return
    const t = window.setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS)
    return () => window.clearTimeout(t)
  }, [enabled])
  const leaving = ready && minElapsed
  useEffect(() => {
    if (!leaving || done) return
    const t = window.setTimeout(() => setDone(true), SPLASH_FADE_MS)
    return () => window.clearTimeout(t)
  }, [leaving, done])
  if (done) return 'done'
  return leaving ? 'leaving' : 'show'
}

function Gate({ isDev, memory, initialPath }: { isDev: boolean; memory: boolean; initialPath: string }) {
  const { gate } = useSession()
  const ready = gate.kind !== 'pending'
  const splash = useSplash(!memory && import.meta.env.MODE !== 'test', ready)
  const greeting = useMemo(() => {
    if (gate.kind === 'in') return greetingText(gate.account.email)
    const hint = readSignInHint()
    return hint ? greetingText(hint.email) : null
  }, [gate])
  const router = useMemo(() => {
    const routes = buildRoutes(isDev)
    if (memory) {
      const entries = sheetEntries(initialPath)
      return createMemoryRouter(routes, { initialEntries: entries, initialIndex: entries.length - 1 })
    }
    prepareBrowserHistory()
    return createBrowserRouter(routes)
  }, [isDev, memory, initialPath])
  if (gate.kind === 'corrupt') return <p>Dati locali illeggibili</p>
  return (
    <>
      {ready ? <RouterProvider router={router} /> : null}
      {ready ? <UpdateNotice /> : null}
      {!ready || splash !== 'done' ? <LoadingSplash leaving={ready && splash === 'leaving'} greeting={greeting} /> : null}
    </>
  )
}

export function App({ isDev = import.meta.env.DEV, memory = false, initialPath = '/' }: { isDev?: boolean; memory?: boolean; initialPath?: string }) {
  return (
    <Providers>
      <Gate isDev={isDev} memory={memory} initialPath={initialPath} />
    </Providers>
  )
}
