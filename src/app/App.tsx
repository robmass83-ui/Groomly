import { useMemo } from 'react'
import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { Providers } from './providers'
import { buildRoutes } from './router'
import { prepareBrowserHistory, sheetEntries } from './sheetHistory'

function Gate({ isDev, memory, initialPath }: { isDev: boolean; memory: boolean; initialPath: string }) {
  const { gate } = useSession()
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
  if (gate.kind === 'pending') return null
  return <RouterProvider router={router} />
}

export function App({ isDev = import.meta.env.DEV, memory = false, initialPath = '/' }: { isDev?: boolean; memory?: boolean; initialPath?: string }) {
  return (
    <Providers>
      <Gate isDev={isDev} memory={memory} initialPath={initialPath} />
    </Providers>
  )
}
