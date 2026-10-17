import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type LocalAccount, type SessionGate } from '../data/local/auth'
import { clearSignInHint, readSignInHint, writeSignInHint } from '../data/local/signInHint'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { openingGate } from '../lib/authAction'

const PENDING_LIMIT_MS = 10_000

export type RegistrationValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  salonName: string
  vatNumber: string
  address: string
}

type SessionApi = {
  gate: SessionGate
  createAccount: (values: RegistrationValues) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SessionContext = createContext<SessionApi | null>(null)

function accountGate(account: LocalAccount | null): SessionGate {
  return account ? { kind: 'in', account } : { kind: 'out' }
}

function remember(account: LocalAccount): SessionGate {
  writeSignInHint(account)
  return { kind: 'in', account }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<SessionGate>(() => openingGate(firebaseEnabled(), reconcileSession(), readSignInHint() !== null))

  useEffect(() => {
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.watchAuth((account) => {
      if (cancelled) return
      if (account) writeSignInHint(account)
      else clearSignInHint()
      setGate(accountGate(account))
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

  useEffect(() => {
    if (gate.kind !== 'pending') return
    const timer = window.setTimeout(() => {
      setGate((current) => (current.kind === 'pending' ? { kind: 'out' } : current))
    }, PENDING_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [gate.kind])

  const api = useMemo<SessionApi>(() => ({
    gate,
    async createAccount(values) {
      if (!firebaseEnabled()) {
        const { firstName, lastName, email, password, salonName, vatNumber, address } = values
        const account = await createAccountRepo(email, password, { firstName, lastName })
        const settings = getSettings(account.uid)
        writeJson(storageKeys.settings(account.uid), {
          ...settings,
          business: { ...settings.business, name: salonName, vatNumber, address, taxCode: '' },
        })
        setGate({ kind: 'in', account })
        return
      }
      const mod = await import('../data/firebase/client')
      setGate(remember(await mod.registerOwner(values)))
    },
    async login(email, password) {
      if (!firebaseEnabled()) {
        const account = await loginRepo(email, password)
        setGate({ kind: 'in', account })
        return
      }
      const mod = await import('../data/firebase/client')
      setGate(remember(await mod.signInEmail(email, password)))
    },
    logout() {
      clearSignInHint()
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
