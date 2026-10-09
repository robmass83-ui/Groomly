import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type LocalAccount, type SessionGate } from '../data/local/auth'

type SessionApi = {
  gate: SessionGate
  createAccount: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SessionContext = createContext<SessionApi | null>(null)

function accountGate(account: LocalAccount | null): SessionGate {
  return account ? { kind: 'in', account } : { kind: 'out' }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<SessionGate>(() => {
    const reconciled = reconcileSession()
    if (!firebaseEnabled()) return reconciled
    if (reconciled.kind === 'corrupt') return reconciled
    return { kind: 'out' }
  })

  useEffect(() => {
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.watchAuth((account) => {
      if (!cancelled) setGate(accountGate(account))
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => {
      if (!cancelled) notifySaveFailed()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const api = useMemo<SessionApi>(() => ({
    gate,
    async createAccount(email, password) {
      if (!firebaseEnabled()) {
        const account = await createAccountRepo(email, password)
        setGate({ kind: 'in', account })
        return
      }
      const mod = await import('../data/firebase/client')
      setGate({ kind: 'in', account: await mod.registerEmail(email, password) })
    },
    async login(email, password) {
      if (!firebaseEnabled()) {
        const account = await loginRepo(email, password)
        setGate({ kind: 'in', account })
        return
      }
      const mod = await import('../data/firebase/client')
      setGate({ kind: 'in', account: await mod.signInEmail(email, password) })
    },
    logout() {
      if (!firebaseEnabled()) {
        logoutRepo()
        setGate({ kind: 'out' })
        return
      }
      void import('../data/firebase/client').then((mod) => mod.signOutEmail()).finally(() => setGate({ kind: 'out' }))
    },
  }), [gate])
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession fuori da SessionProvider')
  return ctx
}
