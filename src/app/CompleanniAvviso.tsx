import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect } from 'react'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { pianoCompleanni } from '../lib/compleanno'
import { localDayKey } from '../lib/appointments'

const COMPLEANNO_ID = 8

export function CompleanniAvviso() {
  const { gate, entry } = useSession()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  const { dogs, settled } = useDogs(uid)
  const frasi = useFrasi()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !uid || !settled) return
    const now = new Date()
    const piano = pianoCompleanni(dogs, now)
    const chiave = `groomly.compleanno.${uid}.${localDayKey(now)}`
    const giaOggi = Boolean(piano?.subito && localStorage.getItem(chiave))
    if (!piano) return
    const pending = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      if (event.notification.id !== COMPLEANNO_ID) return
      const path = event.notification.extra && typeof event.notification.extra === 'object' && 'path' in event.notification.extra
        ? String(event.notification.extra.path)
        : ''
      if (path.startsWith('/animali')) window.location.assign(path)
    })
    if (!giaOggi) {
      const nomi = piano.nomi.join(', ')
      void (async () => {
        try {
          await LocalNotifications.createChannel({
            id: 'compleanni',
            name: frasi.notificaCompleannoTitolo,
            importance: 4,
            visibility: 1,
          })
          const permission = await LocalNotifications.requestPermissions()
          if (permission.display !== 'granted') return
          await LocalNotifications.schedule({
            notifications: [{
              id: COMPLEANNO_ID,
              title: frasi.notificaCompleannoTitolo,
              body: frasi.notificaCompleanno.replace('{{nomi}}', nomi),
              channelId: 'compleanni',
              schedule: { at: piano.at, allowWhileIdle: true },
              extra: { path: piano.path },
            }],
          })
          if (piano.subito) localStorage.setItem(chiave, '1')
        } catch {
          return
        }
      })()
    }
    return () => {
      void pending.then((handle) => handle.remove())
    }
  }, [uid, settled, dogs, frasi])

  return null
}
