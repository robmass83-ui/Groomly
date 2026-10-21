import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { writePushDevice } from '../data/firebase/client'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useSession } from '../hooks/useSession'
import { APP_VERSION } from '../lib/appVersion'
import { pushDeviceId, pushTapPath } from '../lib/pushDevice'
import { PUSH_FIREBASE_CONFIGURED } from '../lib/pushFirebaseConfigured'
import { setPushStatus } from '../lib/pushStatus'

const PUSH_READY_KEY = 'groomly.pushUpdatesReady'
const PUSH_TOKEN_KEY = 'groomly.pushToken'
const COMPLETE_CHANNEL = 'da-completare'
const REMINDER_CHANNEL = 'promemoria'
const UPDATE_CHANNEL = 'aggiornamenti'
const UPDATE_NOTIFICATION_ID = 2

function localPushId(appointmentId: string): number {
  let hash = 0
  for (const character of appointmentId) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0
  }
  return 1000 + (hash % 1_999_999_001)
}

export function PushHost() {
  const navigate = useNavigate()
  const { gate, entry } = useSession()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  const { prefs, save } = usePushPrefs(uid)
  const permissionAskedRef = useRef(false)

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
      if (cancelled || !prefs.enabled) return
      localStorage.setItem(PUSH_TOKEN_KEY, token)
      await writePushDevice(uid, pushDeviceId(), { token, appVersion: APP_VERSION })
      if (cancelled || !prefs.enabled) {
        localStorage.removeItem(PUSH_TOKEN_KEY)
        await writePushDevice(uid, pushDeviceId(), null)
        return
      }
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
            const path = pushTapPath(notification.data as Record<string, string>)
            if (path) navigate(path)
          }).then(storeHandle),
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            const data = notification.data as Record<string, string>
            if (data.type !== 'complete' && data.type !== 'reminder') return
            void LocalNotifications.schedule({
              notifications: [{
                id: localPushId(data.appointmentId ?? data.url ?? data.type),
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
            const path = pushTapPath(data)
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
          localStorage.removeItem(PUSH_TOKEN_KEY)
          clearReady()
          setPushStatus({ unavailable: false })
          await writePushDevice(uid, pushDeviceId(), null)
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
  }, [navigate, prefs, save, uid])

  return null
}
