import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useRef } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { appointmentKind } from '../lib/personal'
import { fineDellaVisita, oraRoma, visitaDaAvvisare, type VisitaOrario } from '../lib/orarioScaduto'

const ORARIO_ID = 9
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
  const mandato = useRef('')

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
    const avvisate = leggiAvvisate(uid)
    const scelta = visitaDaAvvisare(visite, new Date(), new Set(avvisate))
    const pending = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      if (event.notification.id !== ORARIO_ID) return
      const extra = event.notification.extra
      const path = extra && typeof extra === 'object' && 'path' in extra ? String(extra.path) : ''
      if (path.startsWith('/appuntamenti/')) window.location.assign(path)
    })
    const ultimo = avvisate.at(-1)
    const schedula = Boolean(scelta && mandato.current !== uid)
    if (!schedula && ultimo) {
      const visita = appointments.find((item) => item.id === ultimo)
      if (!visita || visita.status !== 'programmato') {
        void LocalNotifications.cancel({ notifications: [{ id: ORARIO_ID }] }).catch(() => undefined)
      }
    }
    if (scelta && schedula) {
      mandato.current = uid
      const nome = scelta.nome.trim() || frasi.pushSenzaNome
      const ora = oraRoma(scelta.fine)
      const corpo = `${frasi.notificaOrarioScaduto.replace('{{nome}}', () => nome).replace('{{ora}}', () => ora)} ${frasi.notificaOrarioScadutoApri}`
      void (async () => {
        try {
          await LocalNotifications.createChannel({
            id: CANALE,
            name: frasi.notificaOrarioScadutoTitolo,
            importance: 4,
            visibility: 1,
          })
          const permission = await LocalNotifications.requestPermissions()
          if (permission.display !== 'granted') {
            if (mandato.current === uid) mandato.current = ''
            return
          }
          await LocalNotifications.schedule({
            notifications: [{
              id: ORARIO_ID,
              title: frasi.notificaOrarioScadutoTitolo,
              body: corpo,
              channelId: CANALE,
              schedule: { at: new Date(Date.now() + 60_000), allowWhileIdle: true },
              extra: { path: `/appuntamenti/${scelta.id}` },
            }],
          })
          ricorda(uid, scelta.id)
        } catch {
          if (mandato.current === uid) mandato.current = ''
        }
      })()
    }
    return () => {
      void pending.then((handle) => handle.remove())
    }
  }, [uid, settled, synced, dogs, appointments, frasi])

  return null
}
