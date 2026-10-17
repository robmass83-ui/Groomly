import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppError } from '../data/errors'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type LocalAccount, type SessionGate } from '../data/local/auth'
import { clearSignInHint, readSignInHint, writeSignInHint } from '../data/local/signInHint'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { openingGate } from '../lib/authAction'
import { entryGate, type EntryGate } from '../lib/authGate'

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

type OwnerProfile = Pick<RegistrationValues, 'firstName' | 'lastName' | 'salonName' | 'vatNumber' | 'address'>

type SessionApi = {
  gate: SessionGate
  /** Quale schermata spetta a chi è entrato: home, conferma email o riparazione del salone. */
  entry: EntryGate
  emailVerified: boolean
  legacy: boolean
  hasAccountDoc: boolean
  createAccount: (values: RegistrationValues) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  resendVerification: () => Promise<void>
  reloadVerification: () => Promise<boolean>
  sendReset: (email: string) => Promise<void>
  repair: () => Promise<void>
}

const SessionContext = createContext<SessionApi | null>(null)

function accountGate(account: LocalAccount | null): SessionGate {
  return account ? { kind: 'in', account } : { kind: 'out' }
}

function remember(account: LocalAccount): SessionGate {
  writeSignInHint(account)
  return { kind: 'in', account }
}

function offline(): AppError {
  return new AppError('Connessione assente', 'auth_offline')
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<SessionGate>(() => openingGate(firebaseEnabled(), reconcileSession(), readSignInHint() !== null))
  // Finché Firebase non ha risposto, un accesso già sul telefono apre la home: l'email e il salone non sono ancora noti.
  const [cloudSeen, setCloudSeen] = useState(false)
  const [verified, setVerified] = useState(false)
  // I dati della registrazione restano finché il salone non è scritto: servono a Riprova.
  const profile = useRef<OwnerProfile | null>(null)

  useEffect(() => {
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.watchAuth((account) => {
      if (cancelled) return
      if (account) writeSignInHint(account)
      else clearSignInHint()
      setVerified(account ? mod.lastEmailVerified() : false)
      setCloudSeen(account !== null)
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

  const api = useMemo<SessionApi>(() => {
    const account = gate.kind === 'in' ? gate.account : null
    const firebase = firebaseEnabled()
    const emailVerified = !firebase || verified
    const legacy = account?.legacy === true
    const hasAccountDoc = Boolean(account?.salonId)
    const entry: EntryGate = account && (!firebase || cloudSeen)
      ? entryGate({ firebase, email: account.email, emailVerified, legacy, hasAccountDoc })
      : { kind: 'home' }
    return {
      gate,
      entry,
      emailVerified,
      legacy,
      hasAccountDoc,
      async createAccount(values) {
        if (!firebaseEnabled()) {
          const { firstName, lastName, email, password, salonName, vatNumber, address } = values
          const created = await createAccountRepo(email, password, { firstName, lastName })
          const settings = getSettings(created.uid)
          writeJson(storageKeys.settings(created.uid), {
            ...settings,
            business: { ...settings.business, name: salonName, vatNumber, address, taxCode: '' },
          })
          setGate({ kind: 'in', account: created })
          return
        }
        const { firstName, lastName, salonName, vatNumber, address } = values
        profile.current = { firstName, lastName, salonName, vatNumber, address }
        const mod = await import('../data/firebase/client')
        let registered: LocalAccount
        try {
          registered = await mod.registerOwner(values)
        } catch (error) {
          // Solo un salone non scritto lascia un utente da riparare: gli altri errori non servono a Riprova.
          if (!(error instanceof AppError && error.code === 'storage_write')) profile.current = null
          throw error
        }
        profile.current = null
        setVerified(mod.lastEmailVerified())
        setCloudSeen(true)
        setGate(remember(registered))
      },
      async login(email, password) {
        if (!firebaseEnabled()) {
          const signedIn = await loginRepo(email, password)
          setGate({ kind: 'in', account: signedIn })
          return
        }
        const mod = await import('../data/firebase/client')
        const signedIn = await mod.signInEmail(email, password)
        profile.current = null
        setVerified(mod.lastEmailVerified())
        setCloudSeen(true)
        setGate(remember(signedIn))
      },
      logout() {
        clearSignInHint()
        profile.current = null
        if (!firebaseEnabled()) {
          logoutRepo()
          setGate({ kind: 'out' })
          return
        }
        void import('../data/firebase/client').then((mod) => mod.signOutEmail()).finally(() => {
          setVerified(false)
          setCloudSeen(false)
          setGate({ kind: 'out' })
        })
      },
      async resendVerification() {
        if (!firebaseEnabled()) throw offline()
        const mod = await import('../data/firebase/client')
        await mod.sendVerification()
      },
      async reloadVerification() {
        if (!firebaseEnabled()) throw offline()
        const mod = await import('../data/firebase/client')
        const confirmed = await mod.reloadEmailVerified()
        if (confirmed) setVerified(true)
        return confirmed
      },
      async sendReset(email) {
        if (!firebaseEnabled()) throw offline()
        const mod = await import('../data/firebase/client')
        await mod.sendPasswordReset(email)
      },
      async repair() {
        if (!firebaseEnabled()) throw offline()
        const input = profile.current
        if (!input || gate.kind !== 'in') throw new AppError('Salvataggio non riuscito', 'storage_write')
        const mod = await import('../data/firebase/client')
        await mod.repairOwnerSalon(input)
        profile.current = null
        setVerified(mod.lastEmailVerified())
        setCloudSeen(true)
        setGate((current) => (current.kind === 'in'
          ? { kind: 'in', account: { ...current.account, firstName: input.firstName.trim(), lastName: input.lastName.trim(), salonId: current.account.uid, legacy: false } }
          : current))
      },
    }
  }, [gate, verified, cloudSeen])
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession fuori da SessionProvider')
  return ctx
}
