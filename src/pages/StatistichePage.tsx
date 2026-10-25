import { Navigate } from 'react-router-dom'
import { SchedeStatistiche } from '../components/piano/SchedeStatistiche'
import { Header } from '../components/layout/Header'
import { useAppointments } from '../hooks/useAppointments'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { haAccesso } from '../lib/piano'
import { clientiInRitardo, euroOra, previsione, type VisitaStat } from '../lib/statistiche'
import { STATO_COMPLETATO, STATO_DISDETTO, sumDuration } from '../lib/appointments'
import { useFrasi } from '../i18n/LinguaContext'
import { ShellFrame } from './ShellFrame'
import type { Appointment } from '../types/models'

function visitaDi(item: Appointment): VisitaStat | null {
  if (item.status !== 'programmato' && item.status !== STATO_COMPLETATO && item.status !== STATO_DISDETTO && item.status !== 'non_venuto') return null
  return {
    status: item.status,
    incasso: item.total ?? item.services.reduce((sum, line) => sum + line.price, 0),
    minutiEffettivi: item.actualDurationMin,
    minutiPrevisti: sumDuration(item.services),
    dogId: item.dogId,
    start: item.start,
  }
}

export function StatistichePage() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { appointments } = useAppointments(uid)
  if (!piano.mostraPiani) return <Navigate to="/incassi/report" replace />
  const visite = appointments.flatMap((item) => {
    const visita = visitaDi(item)
    return visita ? [visita] : []
  })
  const accesso = haAccesso(piano.stato, 'statistiche')
  return (
    <ShellFrame>
      <Header title={frasi.statistiche} backTo="/incassi/report" />
      <SchedeStatistiche
        mostra
        accesso={accesso}
        euro={euroOra(visite)}
        atteso={previsione(visite)}
        ritardo={clientiInRitardo(visite, new Date()).length}
        onPaywall={() => piano.apriPaywall('statistiche')}
      />
    </ShellFrame>
  )
}
