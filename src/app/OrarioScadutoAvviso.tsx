import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useRef } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { appointmentKind } from '../lib/personal'
import { fineDellaVisita, idDaAnnullare, idNotifica, oraRoma, visiteDaProgrammare, type VisitaOrario } from '../lib/orarioScaduto'

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

function dimentica(uid: string, ids: readonly string[]) {
  const tolti = new Set(ids)
  const rimasti = leggiAvvisate(uid).filter((id) => !tolti.has(id))
  localStorage.setItem(chiave(uid), JSON.stringify(rimasti))
}

async function togliDalTelefono(ids: readonly string[]) {
  const notifiche = ids.map((id) => idNotifica(id))
  await LocalNotifications.cancel({ notifications: notifiche.map((id) => ({ id })) })
  await LocalNotifications.removeDeliveredNotificationsById({ ids: notifiche })
}

export function OrarioScadutoAvviso() {
  const { gate, entry } = useSession()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : ''
  const { dogs, settled } = useDogs(uid)
  const { appointments, synced } = useAppointments(uid)
  const frasi = useFrasi()
  const visiteRef = useRef<VisitaOrario[]>([])
  const ticket = useRef(0)

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
    visiteRef.current = visite
    const ora = new Date()
    const avvisate = new Set(leggiAvvisate(uid))
    const daAnnullare = idDaAnnullare(visite, avvisate)
    const scelte = visiteDaProgrammare(visite, ora, avvisate)
    const mine = ++ticket.current
    const pending = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const extra = event.notification.extra
      const path = extra && typeof extra === 'object' && 'path' in extra ? String(extra.path) : ''
      if (path.startsWith('/appuntamenti/')) window.location.assign(path)
    })
    const ancoraAperta = (id: string) => visiteRef.current.some((visita) => visita.id === id && visita.status === 'programmato')
    void (async () => {
      try {
        if (daAnnullare.length > 0) {
          await togliDalTelefono(daAnnullare)
          if (ticket.current !== mine) return
          dimentica(uid, daAnnullare)
        }
        if (scelte.length === 0 || ticket.current !== mine) return
        await LocalNotifications.createChannel({
          id: CANALE,
          name: frasi.notificaOrarioScadutoTitolo,
          importance: 4,
          visibility: 1,
        })
        const permission = await LocalNotifications.requestPermissions()
        if (ticket.current !== mine || permission.display !== 'granted') return
        const ancora = scelte.filter((scelta) => ancoraAperta(scelta.id))
        if (ancora.length === 0) return
        await LocalNotifications.schedule({
          notifications: ancora.map((scelta) => {
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
        const morte = ancora.filter((scelta) => !ancoraAperta(scelta.id))
        if (morte.length > 0) await togliDalTelefono(morte.map((scelta) => scelta.id))
        if (ticket.current !== mine) return
        for (const scelta of ancora) {
          if (ancoraAperta(scelta.id)) ricorda(uid, scelta.id)
        }
      } catch {
        // la prossima apertura riprova le visite non ancora ricordate
      }
    })()
    return () => {
      ticket.current += 1
      void pending.then((handle) => handle.remove())
    }
  }, [uid, settled, synced, dogs, appointments, frasi])

  return null
}
