import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type SessionGate } from '../data/local/auth'

type SessionApi = {
  gate: SessionGate
  createAccount: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SessionContext = createContext<SessionApi | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<SessionGate>(() => reconcileSession())
  const api = useMemo<SessionApi>(() => ({
    gate,
    async createAccount(email, password) {
      const account = await createAccountRepo(email, password)
      setGate({ kind: 'in', account })
    },
    async login(email, password) {
      const account = await loginRepo(email, password)
      setGate({ kind: 'in', account })
    },
    logout() {
      logoutRepo()
      setGate({ kind: 'out' })
    },
  }), [gate])
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession fuori da SessionProvider')
  return ctx
}
