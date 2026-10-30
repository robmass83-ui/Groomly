import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppError } from '../data/errors'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type LocalAccount, type SessionGate } from '../data/local/auth'
import { clearPendingSalon, readPendingSalon, writePendingSalon } from '../data/local/pendingSalon'
import { clearSignInHint, readSignInHint, writeSignInHint } from '../data/local/signInHint'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { openingGate } from '../lib/authAction'
import { entryGate, type EntryGate } from '../lib/authGate'
import { PUSH_TOKEN_KEY, pushDeviceId, pushLocaleDaTogliere } from '../lib/pushDevice'

const PENDING_LIMIT_MS = 10_000

export type RegistrationValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  salonName: string
  vatNumber: string
  address?: string
  accettaTermini: boolean
}

export type RepairProfile = { firstName: string; lastName: string; salonName: string }

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
  resendVerification: () => Promise<{ alreadyVerified?: boolean } | void>
  reloadVerification: () => Promise<boolean>
  sendReset: (email: string) => Promise<void>
  /** Il profilo rimasto sul telefono ha la precedenza; il modulo di Riprova serve solo a chi non ne ha. */
  repair: (profile?: RepairProfile) => Promise<void>
  /** Mette nel gate l'account riletto dal server, senza riscrivere l'account locale. */
  replaceAccount: (account: LocalAccount) => void
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
  useEffect(() => {
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.watchAuth((account) => {
      if (cancelled) return
      if (account) {
        writeSignInHint(account)
        if (account.salonId) clearPendingSalon(account.email)
      } else clearSignInHint()
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
          const { firstName, lastName, email, password, salonName, vatNumber, address = '' } = values
          const created = await createAccountRepo(email, password, { firstName, lastName })
          const settings = getSettings(created.uid)
          writeJson(storageKeys.settings(created.uid), {
            ...settings,
            business: { ...settings.business, salonName, name: salonName, vatNumber, address, taxCode: '' },
          })
          setGate({ kind: 'in', account: created })
          return
        }
        const { firstName, lastName, salonName, vatNumber, address = '' } = values
        // Prima di creare l'utente: da quel momento ogni errore o riavvio può lasciare un utente senza salone.
        // Il profilo si toglie solo a salone scritto, mai su un errore, perché non si sa se l'utente esiste già.
        writePendingSalon(values.email, { firstName, lastName, salonName, vatNumber, address })
        const mod = await import('../data/firebase/client')
        const registered = await mod.registerOwner({ ...values, address })
        clearPendingSalon(values.email)
        clearPendingSalon(registered.email)
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
        // Con un salone già scritto il profilo rimasto non serve più; senza, resta per Riprova.
        if (signedIn.salonId) clearPendingSalon(signedIn.email)
        setVerified(mod.lastEmailVerified())
        setCloudSeen(true)
        setGate(remember(signedIn))
      },
      logout() {
        // Il profilo di una registrazione da finire resta anche dopo Esci: non si sa se il salone esiste.
        clearSignInHint()
        const uid = gate.kind === 'in' ? gate.account.uid : ''
        if (!firebaseEnabled()) {
          logoutRepo()
          setGate({ kind: 'out' })
          return
        }
        void (async () => {
          try {
            const token = localStorage.getItem(PUSH_TOKEN_KEY) ?? ''
            if (uid && token) {
              const mod = await import('../data/firebase/client')
              await mod.rilasciaPushDelTelefono(uid, pushDeviceId(), token)
            }
            const { Capacitor } = await import('@capacitor/core')
            if (Capacitor.getPlatform() === 'android') {
              const { LocalNotifications } = await import('@capacitor/local-notifications')
              const [pending, delivered] = await Promise.all([
                LocalNotifications.getPending(),
                LocalNotifications.getDeliveredNotifications(),
              ])
              const pendingIds = pushLocaleDaTogliere(pending.notifications, '')
              if (pendingIds.length > 0) {
                await LocalNotifications.cancel({ notifications: pendingIds.map((id) => ({ id })) })
              }
              const deliveredIds = pushLocaleDaTogliere(delivered.notifications, '')
              if (deliveredIds.length > 0) {
                await LocalNotifications.removeDeliveredNotificationsById({ ids: deliveredIds })
              }
            }
          } catch {
            // L'uscita non resta appesa se il telefono non si stacca dal salone precedente.
          }
          try {
            const mod = await import('../data/firebase/client')
            await mod.signOutEmail()
          } finally {
            setVerified(false)
            setCloudSeen(false)
            setGate({ kind: 'out' })
          }
        })()
      },
      async resendVerification() {
        if (!firebaseEnabled()) throw offline()
        const mod = await import('../data/firebase/client')
        return mod.sendVerification()
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
      async repair(profile) {
        if (!firebaseEnabled()) throw offline()
        if (gate.kind !== 'in') throw new AppError('Salvataggio non riuscito', 'storage_write')
        // Il profilo rimasto sul telefono ha la precedenza; il modulo serve solo a chi non ne ha.
        const saved = readPendingSalon(gate.account.email)
        const input = saved ?? (profile ? { ...profile, vatNumber: '', address: '' } : null)
        if (!input) throw new AppError('Salvataggio non riuscito', 'storage_write')
        const mod = await import('../data/firebase/client')
        await mod.repairOwnerSalon(input)
        clearPendingSalon(gate.account.email)
        setVerified(mod.lastEmailVerified())
        setCloudSeen(true)
        setGate((current) => (current.kind === 'in'
          ? { kind: 'in', account: { ...current.account, firstName: input.firstName.trim(), lastName: input.lastName.trim(), salonId: current.account.uid, legacy: false } }
          : current))
      },
      replaceAccount(account) {
        writeSignInHint(account)
        if (account.salonId) clearPendingSalon(account.email)
        setCloudSeen(true)
        setGate({ kind: 'in', account })
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
