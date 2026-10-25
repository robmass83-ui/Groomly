import { useEffect, useMemo, useState } from 'react'
import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { readSignInHint } from '../data/local/signInHint'
import { getAccount } from '../data/local/auth'
import { useSession } from '../hooks/useSession'
import { greetingText } from '../lib/greeting'
import { Providers } from './providers'
import { buildRoutes } from './router'
import { prepareBrowserHistory, sheetEntries } from './sheetHistory'
import { aggiornamentiApkAttivi } from '../lib/distribuzione'
import { UpdateNotice } from './UpdateNotice'
import { LoadingSplash } from './LoadingSplash'

/** La home non resta coperta dopo l’accesso: lo splash esce appena il gate è pronto. */
const SPLASH_KNOWN_MS = 0
const SPLASH_FIRST_MS = 0
const SPLASH_FADE_MS = 0

function splashMinMs(): number {
  try {
    return readSignInHint() || getAccount() ? SPLASH_KNOWN_MS : SPLASH_FIRST_MS
  } catch {
    return SPLASH_FIRST_MS
  }
}

function useSplash(enabled: boolean, ready: boolean): 'show' | 'leaving' | 'done' {
  const [minMs] = useState(splashMinMs)
  const [minElapsed, setMinElapsed] = useState(!enabled)
  const [done, setDone] = useState(!enabled)
  useEffect(() => {
    if (!enabled) return
    const t = window.setTimeout(() => setMinElapsed(true), minMs)
    return () => window.clearTimeout(t)
  }, [enabled, minMs])
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
    if (gate.kind === 'in') return greetingText(gate.account.email, gate.account.firstName)
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
      {ready && gate.kind === 'in' && aggiornamentiApkAttivi() ? <UpdateNotice /> : null}
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
