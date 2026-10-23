import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useRef, type ReactNode } from 'react'
import { ToastProvider, useToast } from '../components/layout/Toast'
import { firebaseEnabled, notifySaveFailed, readsLocal, subscribeSaveFailed } from '../data/firebase/enabled'
import { readJson, storageKeys } from '../data/local/storage'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { SessionProvider, useSession } from '../hooks/useSession'
import { SettingsProvider, useSettings } from '../hooks/useSettings'
import { backupDay, buildBackup, isEmptyBackup, maybeDailyBackup } from '../lib/backupDoc'
import { dueSoon } from '../lib/cycle'
import { reminderText } from '../lib/reminderText'
import { DriveInvioAuto } from './DriveInvioAuto'

const REMINDER_ID = 1
const REMINDER_CHANNEL = 'promemoria-mensili'

function reminderAt(time: string, now: Date): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  const hours = match ? Number(match[1]) : 18
  const minutes = match ? Number(match[2]) : 30
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1)
  return at
}

function MonthlyReminder() {
  const { gate, entry } = useSession()
  // Con l'email da confermare o il salone da riparare non parte nessun lavoro in sottofondo.
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  return <MonthlyReminderForAccount key={uid} />
}

function MonthlyReminderForAccount() {
  const { gate, entry } = useSession()
  const { settings } = useSettings()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  const { dogs, settled: dogsSettled } = useDogs(uid)
  const { appointments, synced: appointmentsSynced, dropMissing } = useAppointments(uid)
  const { enabled, time, daysBefore } = settings.monthlyReminder
  const ticket = useRef(0)
  const dogsRef = useRef(dogs)
  dogsRef.current = dogs
  const dropRef = useRef(dropMissing)
  dropRef.current = dropMissing
  const swept = useRef(false)
  const firstAppointmentIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!appointmentsSynced || firstAppointmentIds.current) return
    firstAppointmentIds.current = new Set(appointments.map((item) => item.id))
  }, [appointmentsSynced, appointments])

  useEffect(() => {
    if (!uid || !dogsSettled || !firstAppointmentIds.current || swept.current) return
    const ids = firstAppointmentIds.current
    const delay = !firebaseEnabled() || readsLocal() ? 0 : 1500
    const timer = window.setTimeout(() => {
      swept.current = true
      dropRef.current(new Set(dogsRef.current.map((dog) => dog.id)), ids)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [uid, dogsSettled, appointmentsSynced])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const pending = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      if (event.notification.id !== REMINDER_ID) return
      window.location.assign('/mensili')
    })
    return () => {
      void pending.then((handle) => handle.remove())
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const mine = ++ticket.current
    const text = uid ? reminderText(dueSoon(dogs, appointments, new Date(), daysBefore)) : null
    const at = reminderAt(time, new Date())
    void (async () => {
      try {
        if (!enabled || !text) {
          if (ticket.current !== mine) return
          await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
          return
        }
        await LocalNotifications.createChannel({
          id: REMINDER_CHANNEL,
          name: 'Promemoria mensili',
          importance: 4,
          visibility: 1,
        })
        if (ticket.current !== mine) return
        const permission = await LocalNotifications.requestPermissions()
        if (ticket.current !== mine) return
        if (permission.display !== 'granted') return
        await LocalNotifications.schedule({
          notifications: [{
            id: REMINDER_ID,
            title: 'Promemoria mensili',
            body: text,
            channelId: REMINDER_CHANNEL,
            schedule: { at, allowWhileIdle: true },
          }],
        })
      } catch {
        return
      }
    })()
    return () => {
      ticket.current += 1
    }
  }, [uid, dogs, appointments, enabled, time, daysBefore])

  return null
}

function DailyBackup() {
  const { gate, entry } = useSession()
  const { reload } = useSettings()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : null
  useEffect(() => {
    if (!uid) return
    if (firebaseEnabled() && !readsLocal()) {
      void import('../data/firebase/client').then((mod) => mod.runCloudDailyBackup(uid)).catch(() => notifySaveFailed())
      return
    }
    try {
      const before = readJson<{ backup?: { lastAt?: string } }>(storageKeys.settings(uid))?.backup?.lastAt
      maybeDailyBackup(uid)
      reload()
      if (!firebaseEnabled()) return
      const after = readJson<{ backup?: { lastAt?: string } }>(storageKeys.settings(uid))?.backup?.lastAt
      if (!after || after === before) return
      const bundle = buildBackup(uid)
      if (isEmptyBackup(bundle)) return
      void import('../data/firebase/client').then((mod) => {
        mod.enqueueBackup(backupDay(new Date()), JSON.stringify(bundle))
      })
    } catch {
      return
    }
  }, [uid, reload])
  return null
}

function SaveFailedToast() {
  const toast = useToast()
  useEffect(() => subscribeSaveFailed(() => toast.show('Salvataggio non riuscito', 'plain')), [toast])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <DailyBackup />
        <MonthlyReminder />
        <ToastProvider>
          <SaveFailedToast />
          <DriveInvioAuto />
          {children}
        </ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
