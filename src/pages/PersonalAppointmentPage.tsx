import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAppointments } from '../hooks/useAppointments'
import { useSession } from '../hooks/useSession'
import { combineDayTime, localDayKey, parseDayParam } from '../lib/appointments'
import { formatHomeDate } from '../lib/format'
import { appointmentKind, personalEndOk, personalTitleOk } from '../lib/personal'
import { appointmentBackTarget } from '../lib/sheetRoute'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentWrite } from '../types/models'

function clockOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function clockValue(value: string): string | null {
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${match[1]}:${match[2]}`
}

function deleteQuestion(appointment: Appointment): string {
  return `Eliminare ${appointment.title ?? ''} del ${formatHomeDate(appointment.start)} alle ${clockOf(appointment.start)}?`
}

export function PersonalAppointmentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { appointments, saveNew, saveExisting, remove } = useAppointments(uid)
  const existing = id ? appointments.find((item) => item.id === id && appointmentKind(item) === 'personale') : undefined
  const [title, setTitle] = useState(existing?.title ?? '')
  const [day, setDay] = useState(() => existing ? localDayKey(existing.start) : localDayKey(parseDayParam(searchParams.get('data'), new Date())))
  const [startTime, setStartTime] = useState(existing ? clockOf(existing.start) : '')
  const [endTime, setEndTime] = useState(existing?.plannedEnd ? clockOf(existing.plannedEnd) : '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [endError, setEndError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const seededId = useRef(existing?.id ?? null)

  useEffect(() => {
    if (!existing || seededId.current === existing.id) return
    seededId.current = existing.id
    setTitle(existing.title ?? '')
    setDay(localDayKey(existing.start))
    setStartTime(clockOf(existing.start))
    setEndTime(existing.plannedEnd ? clockOf(existing.plannedEnd) : '')
  }, [existing])

  function closeSheet() {
    if (location.key === 'default') navigate(appointmentBackTarget(location.search, () => false), { replace: true })
    else navigate(-1)
  }

  function onSave() {
    const titleOk = personalTitleOk(title)
    const startClock = clockValue(startTime)
    const endWritten = endTime.trim() !== ''
    const endClock = endWritten ? clockValue(endTime) : null
    const start = startClock ? combineDayTime(day, startClock) : null
    const plannedEnd = endClock ? combineDayTime(day, endClock) : null
    const endOk = !endWritten || Boolean(
      start && plannedEnd && !Number.isNaN(start.getTime()) && !Number.isNaN(plannedEnd.getTime()) && personalEndOk(start, plannedEnd),
    )
    setTitleError(titleOk ? null : 'Scrivi un titolo.')
    setEndError(endOk ? null : "L'ora di fine è dopo l'inizio.")
    if (!titleOk || !endOk || !start || Number.isNaN(start.getTime())) return
    const write: AppointmentWrite = {
      dogId: '',
      start,
      services: [],
      kind: 'personale',
      title: title.trim(),
    }
    if (plannedEnd) write.plannedEnd = plannedEnd
    const saved = existing ? saveExisting(existing.id, write) : saveNew(write)
    if (!saved) return
    closeSheet()
  }

  function onConfirmDelete() {
    if (!existing || !remove(existing.id)) return
    closeSheet()
  }

  return (
    <Dialog open title="Appuntamento personale" onClose={closeSheet}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Input label="Titolo" value={title} autoComplete="off" onChange={(event) => setTitle(event.target.value)} error={titleError ?? undefined} />
        <Input label="Data" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
        <Input label="Ora di inizio" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        <Input label="Ora di fine" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} error={endError ?? undefined} />
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta }}>Se non la sai, lasciala vuota.</p>
        <Button type="submit" style={{ width: '100%' }}>Salva</Button>
        {existing ? (
          <Button type="button" variant="bad" onClick={() => setConfirming(true)} style={{ width: '100%' }}>Elimina</Button>
        ) : null}
      </form>
      {existing ? (
        <Dialog open={confirming} title={deleteQuestion(existing)} onClose={() => setConfirming(false)}>
          <Button variant="ghost" onClick={() => setConfirming(false)}>Annulla</Button>
          <Button variant="bad" onClick={onConfirmDelete}>Elimina</Button>
        </Dialog>
      ) : null}
    </Dialog>
  )
}
