import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { AppError } from '../data/errors'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type LocalAccount, type SessionGate } from '../data/local/auth'
import { openingGate, shouldFallbackToSignIn } from '../lib/authAction'

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
  const [gate, setGate] = useState<SessionGate>(() => openingGate(firebaseEnabled(), reconcileSession()))

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
      if (cancelled) return
      setGate({ kind: 'out' })
      notifySaveFailed()
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
      try {
        setGate({ kind: 'in', account: await mod.registerEmail(email, password) })
      } catch (error) {
        const code = error instanceof AppError ? error.code : ''
        if (!shouldFallbackToSignIn(code)) throw error
        setGate({ kind: 'in', account: await mod.signInEmail(email, password) })
      }
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
