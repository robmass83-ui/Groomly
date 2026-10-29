import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { confermaPushTelefono, prendiPushTelefono, writePushDevice } from '../data/firebase/client'
import { listAppointments } from '../data/local/appointments'
import { useAppointments } from '../hooks/useAppointments'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useSession } from '../hooks/useSession'
import { APP_VERSION } from '../lib/appVersion'
import { PUSH_TOKEN_KEY, pushDelSalone, pushDeviceId, pushLocaleDaTogliere, pushTapPath } from '../lib/pushDevice'
import { PUSH_FIREBASE_CONFIGURED } from '../lib/pushFirebaseConfigured'
import { idPushCompleta, mostraPushCompleta } from '../lib/pushDue'
import { setPushStatus } from '../lib/pushStatus'

const PUSH_READY_KEY = 'groomly.pushUpdatesReady'
const COMPLETE_CHANNEL = 'da-completare'
const REMINDER_CHANNEL = 'promemoria'
const UPDATE_CHANNEL = 'aggiornamenti'
const UPDATE_NOTIFICATION_ID = 2
const FINESTRA_CHIUSA_MS = 36 * 60 * 60 * 1000

export function PushHost() {
  const navigate = useNavigate()
  const { gate, entry } = useSession()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  const salonId = gate.kind === 'in' && entry.kind === 'home' ? (gate.account.salonId ?? '') : ''
  const { prefs, save } = usePushPrefs(uid)
  const { appointments } = useAppointments(uid)
  const permissionAskedRef = useRef(false)
  const chiuseTolte = useRef(new Set<string>())

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android' || !uid) return
    const ora = Date.now()
    const ids: number[] = []
    for (const item of appointments) {
      if (item.status === 'programmato' || item.start.getTime() < ora - FINESTRA_CHIUSA_MS) continue
      if (chiuseTolte.current.has(item.id)) continue
      chiuseTolte.current.add(item.id)
      ids.push(idPushCompleta(item.id))
    }
    if (ids.length === 0) return
    void LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) }).catch(() => {})
    void LocalNotifications.removeDeliveredNotificationsById({ ids }).catch(() => {})
  }, [appointments, uid])

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android' || !uid) return
    if (!PUSH_FIREBASE_CONFIGURED) {
      setPushStatus({ unavailable: true })
      localStorage.removeItem(PUSH_READY_KEY)
      return
    }
    let cancelled = false
    let removed = false
    const handles: Array<{ remove: () => Promise<void> }> = []
    const storeHandle = (handle: { remove: () => Promise<void> }) => {
      handles.push(handle)
      if (removed) void handle.remove()
    }
    const clearReady = () => localStorage.removeItem(PUSH_READY_KEY)

    const markUnavailable = () => {
      localStorage.removeItem(PUSH_TOKEN_KEY)
      clearReady()
      setPushStatus({ unavailable: true })
      void writePushDevice(uid, pushDeviceId(), null).catch(() => {})
    }

    const saveToken = async (token: string) => {
      if (cancelled || !prefs.enabled) {
        if (!cancelled && token) {
          await prendiPushTelefono({ token, deviceId: pushDeviceId(), tieni: false }).catch(() => {})
        }
        return
      }
      localStorage.setItem(PUSH_TOKEN_KEY, token)
      await writePushDevice(uid, pushDeviceId(), { token, appVersion: APP_VERSION })
      if (cancelled || !prefs.enabled) {
        localStorage.removeItem(PUSH_TOKEN_KEY)
        await writePushDevice(uid, pushDeviceId(), null)
        await prendiPushTelefono({ token, deviceId: pushDeviceId(), tieni: false }).catch(() => {})
        return
      }
      await prendiPushTelefono({
        token,
        deviceId: pushDeviceId(),
        tieni: true,
        appVersion: APP_VERSION,
      }).catch(() => {})
      setPushStatus({ unavailable: false })
      if (prefs.updates) {
        localStorage.setItem(PUSH_READY_KEY, '1')
        await LocalNotifications.cancel({ notifications: [{ id: UPDATE_NOTIFICATION_ID }] })
      } else {
        clearReady()
      }
    }

    void (async () => {
      try {
        try {
          const [pending, delivered] = await Promise.all([
            LocalNotifications.getPending(),
            LocalNotifications.getDeliveredNotifications(),
          ])
          const pendingIds = pushLocaleDaTogliere(pending.notifications, salonId)
          if (pendingIds.length > 0) {
            await LocalNotifications.cancel({ notifications: pendingIds.map((id) => ({ id })) })
          }
          const deliveredIds = pushLocaleDaTogliere(delivered.notifications, salonId)
          if (deliveredIds.length > 0) {
            await LocalNotifications.removeDeliveredNotificationsById({ ids: deliveredIds })
          }
        } catch {
          // Senza l'elenco il telefono registra comunque le push di questo accesso.
        }
        await Promise.all([
          PushNotifications.createChannel({ id: COMPLETE_CHANNEL, name: 'Da completare', importance: 4 }),
          PushNotifications.createChannel({ id: UPDATE_CHANNEL, name: 'Aggiornamenti', importance: 4 }),
          PushNotifications.createChannel({ id: REMINDER_CHANNEL, name: 'Promemoria', importance: 4 }),
        ])
        await Promise.all([
          PushNotifications.addListener('registration', ({ value }) => {
            void saveToken(value).catch(markUnavailable)
          }).then(storeHandle),
          PushNotifications.addListener('registrationError', markUnavailable).then(storeHandle),
          PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
            const data = notification.data as Record<string, string>
            if (!pushDelSalone(data, salonId)) return
            const path = pushTapPath(data, salonId)
            if (path) navigate(path)
          }).then(storeHandle),
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            const data = notification.data as Record<string, string>
            if (data.type === 'sfida') {
              if (data.sfida) void confermaPushTelefono(data.sfida).catch(() => {})
              return
            }
            if (data.type !== 'complete' && data.type !== 'reminder') return
            if (!pushDelSalone(data, salonId)) return
            if (data.type === 'complete') {
              const visita = data.appointmentId
                ? listAppointments(uid).find((item) => item.id === data.appointmentId)
                : undefined
              if (!mostraPushCompleta(visita?.status)) return
            }
            void LocalNotifications.schedule({
              notifications: [{
                id: idPushCompleta(data.appointmentId ?? data.url ?? data.type),
                title: notification.title ?? '',
                body: notification.body ?? '',
                channelId: data.type === 'reminder' ? REMINDER_CHANNEL : COMPLETE_CHANNEL,
                extra: data,
              }],
            })
          }).then(storeHandle),
          LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
            const data = event.notification.extra as Record<string, string> | undefined
            if (!data) return
            if (!pushDelSalone(data, salonId)) return
            const path = pushTapPath(data, salonId)
              ?? (data.type === 'complete' && data.appointmentId
                ? `/appuntamenti/${encodeURIComponent(data.appointmentId)}`
                : data.type === 'reminder' && data.appointmentId
                  ? `/appuntamenti/personale/${encodeURIComponent(data.appointmentId)}`
                  : null)
            if (path) navigate(path)
          }).then(storeHandle),
        ])

        if (!prefs.enabled) {
          permissionAskedRef.current = false
          const token = localStorage.getItem(PUSH_TOKEN_KEY) ?? ''
          localStorage.removeItem(PUSH_TOKEN_KEY)
          clearReady()
          setPushStatus({ unavailable: false })
          await writePushDevice(uid, pushDeviceId(), null)
          if (token) await prendiPushTelefono({ token, deviceId: pushDeviceId(), tieni: false }).catch(() => {})
          return
        }

        let permission = await PushNotifications.checkPermissions()
        if (cancelled) return
        if (permission.receive !== 'granted') {
          if (permissionAskedRef.current) return
          permissionAskedRef.current = true
          permission = await PushNotifications.requestPermissions()
          if (cancelled) return
        }
        if (permission.receive !== 'granted') {
          clearReady()
          setPushStatus({ permissionDenied: true })
          save({ ...prefs, enabled: false })
          return
        }
        if (cancelled) return
        setPushStatus({ permissionDenied: false })
        const savedToken = localStorage.getItem(PUSH_TOKEN_KEY)
        if (savedToken) await saveToken(savedToken)
        if (cancelled) return
        if (!prefs.updates) clearReady()
        await PushNotifications.register()
      } catch {
        if (!cancelled && prefs.enabled) markUnavailable()
      }
    })()

    return () => {
      cancelled = true
      removed = true
      for (const handle of handles) void handle.remove()
    }
  }, [navigate, prefs, salonId, save, uid])

  return null
}
