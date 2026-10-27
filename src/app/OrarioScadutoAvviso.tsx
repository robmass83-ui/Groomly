import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { appointmentKind } from '../lib/personal'
import { fineDellaVisita, idNotifica, oraRoma, visiteDaProgrammare, type VisitaOrario } from '../lib/orarioScaduto'

const CANALE = 'orario-scaduto'

function chiave(uid: string): string {
  return `groomly.orario-scaduto.${uid}`
}

function leggiAvvisate(uid: string): string[] {
  try {
    const grezzo = localStorage.getItem(chiave(uid))
    if (!grezzo) return []
    const ids = JSON.parse(grezzo) as unknown
    if (!Array.isArray(ids)) return []
    return ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

function ricorda(uid: string, id: string) {
  const ids = leggiAvvisate(uid)
  if (!ids.includes(id)) ids.push(id)
  localStorage.setItem(chiave(uid), JSON.stringify(ids))
}

export function OrarioScadutoAvviso() {
  const { gate, entry } = useSession()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  const { dogs, settled } = useDogs(uid)
  const { appointments, synced } = useAppointments(uid)
  const frasi = useFrasi()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !uid || !settled || !synced) return
    const nomi = new Map(dogs.map((dog) => [dog.id, dog.name.trim()]))
    const visite: VisitaOrario[] = []
    for (const item of appointments) {
      if (appointmentKind(item) === 'personale') continue
      const fine = fineDellaVisita(item)
      if (!fine) continue
      visite.push({
        id: item.id,
        nome: nomi.get(item.dogId) || '',
        status: item.status,
        fine,
      })
    }
    const ora = new Date()
    const avvisate = new Set(leggiAvvisate(uid))
    const scelte = visiteDaProgrammare(visite, ora, avvisate)
    const pending = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const extra = event.notification.extra
      const path = extra && typeof extra === 'object' && 'path' in extra ? String(extra.path) : ''
      if (path.startsWith('/appuntamenti/')) window.location.assign(path)
    })
    if (scelte.length > 0) {
      void (async () => {
        try {
          await LocalNotifications.createChannel({
            id: CANALE,
            name: frasi.notificaOrarioScadutoTitolo,
            importance: 4,
            visibility: 1,
          })
          const permission = await LocalNotifications.requestPermissions()
          if (permission.display !== 'granted') return
          await LocalNotifications.schedule({
            notifications: scelte.map((scelta) => {
              const nome = scelta.nome.trim() || frasi.pushSenzaNome
              const orologio = oraRoma(scelta.fine)
              const quando = scelta.fine.getTime() <= ora.getTime() ? new Date(ora.getTime() + 5_000) : scelta.fine
              return {
                id: idNotifica(scelta.id),
                title: frasi.notificaOrarioScadutoTitolo,
                body: `${frasi.notificaOrarioScaduto.replace('{{nome}}', nome).replace('{{ora}}', orologio)} ${frasi.notificaOrarioScadutoApri}`,
                channelId: CANALE,
                schedule: { at: quando, allowWhileIdle: true },
                extra: { path: `/appuntamenti/${scelta.id}` },
              }
            }),
          })
          for (const scelta of scelte) ricorda(uid, scelta.id)
        } catch {
          // la prossima apertura riprova le visite non ancora ricordate
        }
      })()
    }
    return () => {
      void pending.then((handle) => handle.remove())
    }
  }, [uid, settled, synced, dogs, appointments, frasi])

  return null
}
