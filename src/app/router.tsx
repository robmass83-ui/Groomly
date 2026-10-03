import type { ReactElement } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate } = useSession()
  if (gate.kind !== 'in') return <Navigate to="/login" replace />
  return children
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const routes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
  if (isDev) routes.push({ path: '/dev/kit', element: <Guard><h1>Kit</h1></Guard> })
  return routes
}

function LoginSwitch() {
  const { gate } = useSession()
  if (gate.kind === 'in') return <Navigate to="/" replace />
  return <LoginPage />
}
