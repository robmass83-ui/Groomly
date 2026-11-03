import { useLocation } from 'react-router-dom'
import { SchedeStatistiche } from '../components/piano/SchedeStatistiche'
import { Header } from '../components/layout/Header'
import { useAppointments } from '../hooks/useAppointments'
import { useSession } from '../hooks/useSession'
import { spettatoreIncassi, visibleAppointments } from '../lib/salonAccess'
import { clientiInRitardo, euroOra, previsione, type VisitaStat } from '../lib/statistiche'
import { STATO_COMPLETATO, STATO_DISDETTO, sumDuration } from '../lib/appointments'
import { useSettings } from '../hooks/useSettings'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { nomeMese } from '../i18n/format'
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
  const location = useLocation()
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { settings } = useSettings()
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const { appointments } = useAppointments(uid)
  const visite = visibleAppointments(appointments, spettatoreIncassi(account)).flatMap((item) => {
    const visita = visitaDi(item)
    return visita ? [visita] : []
  })
  const adesso = new Date()
  const periodo = { inizio: new Date(adesso.getFullYear(), adesso.getMonth(), 1), fine: new Date(adesso.getFullYear(), adesso.getMonth() + 1, 1) }
  return (
    <ShellFrame>
      <Header title={frasi.statistiche} backTo="/incassi/report" backState={location.state} />
      <SchedeStatistiche
        mostra
        euro={euroOra(visite)}
        atteso={previsione(visite, periodo)}
        ritardo={clientiInRitardo(visite, adesso).length}
        nascondi={settings.ui.hideAmounts}
        mese={nomeMese(lingua, adesso)}
      />
    </ShellFrame>
  )
}
