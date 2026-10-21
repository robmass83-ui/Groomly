import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { useAppointments } from '../hooks/useAppointments'
import { useClosures } from '../hooks/useClosures'
import { useSession } from '../hooks/useSession'
import { localDayKey, parseDayParam } from '../lib/appointments'
import { closureRangeOk, closureReasonOk, closuresOverlap, type Closure } from '../lib/closures'
import { formatHomeDate } from '../lib/format'
import { appointmentKind } from '../lib/personal'
import { appointmentBackTarget } from '../lib/sheetRoute'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const REASON_ERROR = 'Scrivi un motivo.'
const RANGE_ERROR = 'La fine del periodo è il giorno di inizio o un giorno dopo.'

type Mode = 'giorno' | 'periodo'

function homeDay(day: string): string {
  return formatHomeDate(parseDayParam(day, new Date()))
}

function overlapMessage(hit: Closure): string {
  if (hit.startDay === hit.endDay) return `Questo giorno è già chiuso (${hit.reason}). Modifica quella chiusura.`
  return `Questi giorni sono già chiusi (${hit.reason} dal ${homeDay(hit.startDay)} al ${homeDay(hit.endDay)}). Modifica quella chiusura.`
}

function visitMessage(count: number): string {
  if (count === 1) return "In questi giorni c'è già 1 visita. La chiusura non le toglie."
  return `In questi giorni ci sono già ${count} visite. La chiusura non le toglie.`
}

function reopenMessage(item: Closure): string {
  if (item.startDay === item.endDay) return 'Riaprire toglie la chiusura di questo giorno.'
  return `Riaprire toglie la chiusura da tutti i giorni, dal ${homeDay(item.startDay)} al ${homeDay(item.endDay)}.`
}

function rangeOk(start: string, end: string): boolean {
  return DAY.test(start) && DAY.test(end) && closureRangeOk(start, end)
}

export function ClosurePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { closures, save, remove } = useClosures(uid)
  const { appointments } = useAppointments(uid)
  const existing = id ? closures.find((item) => item.id === id) : undefined
  const openedDay = localDayKey(parseDayParam(searchParams.get('data'), new Date()))
  const [reason, setReason] = useState(existing?.reason ?? '')
  const [mode, setMode] = useState<Mode>(existing && existing.startDay !== existing.endDay ? 'periodo' : 'giorno')
  const [day, setDay] = useState(existing?.startDay ?? openedDay)
  const [from, setFrom] = useState(existing?.startDay ?? openedDay)
  const [to, setTo] = useState(existing?.endDay ?? openedDay)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [overlap, setOverlap] = useState<Closure | null>(null)
  const [pending, setPending] = useState<Closure | null>(null)
  const [visitCount, setVisitCount] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const seededId = useRef(existing?.id ?? null)

  useEffect(() => {
    if (!existing || seededId.current === existing.id) return
    seededId.current = existing.id
    const single = existing.startDay === existing.endDay
    setReason(existing.reason)
    setMode(single ? 'giorno' : 'periodo')
    setDay(existing.startDay)
    setFrom(existing.startDay)
    setTo(existing.endDay)
  }, [existing])

  function closeSheet() {
    if (location.key === 'default') navigate(appointmentBackTarget(location.search, () => false), { replace: true })
    else navigate(-1)
  }

  function choose(next: Mode) {
    if (next === 'giorno') setDay(from)
    if (next === 'periodo') {
      setFrom(day)
      setTo(day)
    }
    setMode(next)
    setRangeError(null)
  }

  function bounds(): { start: string; end: string } {
    return mode === 'giorno' ? { start: day, end: day } : { start: from, end: to }
  }

  function visitsBetween(start: string, end: string): number {
    return appointments.filter((item) => {
      if (appointmentKind(item) !== 'pelosetto') return false
      const key = localDayKey(item.start)
      return start <= key && key <= end
    }).length
  }

  function draft(): Closure | null {
    const { start, end } = bounds()
    const reasonValid = closureReasonOk(reason)
    const datesValid = rangeOk(start, end)
    setReasonError(reasonValid ? null : REASON_ERROR)
    setRangeError(datesValid ? null : RANGE_ERROR)
    if (!reasonValid || !datesValid) return null
    const now = new Date()
    return {
      id: existing?.id ?? crypto.randomUUID(),
      reason: reason.trim(),
      startDay: start,
      endDay: end,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
  }

  async function persist(next: Closure) {
    await save(next)
    closeSheet()
  }

  async function onSave() {
    setOverlap(null)
    setPending(null)
    setVisitCount(0)
    const next = draft()
    if (!next) return
    const hit = closures.find((item) => item.id !== next.id && closuresOverlap(item, next)) ?? null
    if (hit) {
      setOverlap(hit)
      return
    }
    const count = visitsBetween(next.startDay, next.endDay)
    if (count > 0) {
      setPending(next)
      setVisitCount(count)
      return
    }
    await persist(next)
  }

  async function onConfirmReopen() {
    if (!existing) return
    await remove(existing.id)
    closeSheet()
  }

  const single = mode === 'giorno'

  return (
    <Sheet open title="Chiusura del salone" onClose={closeSheet} closeButton>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Input label="Motivo" value={reason} autoComplete="off" onChange={(event) => setReason(event.target.value)} error={reasonError ?? undefined} />
        <Segmented<Mode>
          fill
          label="Durata"
          value={mode}
          onChange={choose}
          options={[
            { value: 'giorno', label: 'Questo giorno' },
            { value: 'periodo', label: 'Un periodo' },
          ]}
        />
        {single ? (
          <Input label="Data" type="date" value={day} onChange={(event) => setDay(event.target.value)} error={rangeError ?? undefined} />
        ) : (
          <>
            <Input label="Dal" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input label="Al" type="date" value={to} onChange={(event) => setTo(event.target.value)} error={rangeError ?? undefined} />
          </>
        )}
        <Button type="submit" style={{ width: '100%' }}>Salva</Button>
        {existing ? (
          <Button type="button" variant="bad" onClick={() => setConfirming(true)} style={{ width: '100%' }}>Riapri</Button>
        ) : null}
      </form>
      {overlap ? (
        <Dialog open title={overlapMessage(overlap)} onClose={() => setOverlap(null)}>
          <Button type="button" variant="ghost" onClick={() => setOverlap(null)}>Indietro</Button>
          <Button type="button" onClick={() => navigate(`/chiusure/${overlap.id}`)}>Apri</Button>
        </Dialog>
      ) : null}
      {pending && visitCount > 0 ? (
        <Dialog open title={visitMessage(visitCount)} onClose={() => { setPending(null); setVisitCount(0) }}>
          <Button type="button" variant="ghost" onClick={() => { setPending(null); setVisitCount(0) }}>Indietro</Button>
          <Button type="button" onClick={() => void persist(pending)}>Salva</Button>
        </Dialog>
      ) : null}
      {existing && confirming ? (
        <Dialog open title={reopenMessage(existing)} onClose={() => setConfirming(false)}>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Annulla</Button>
          <Button type="button" variant="bad" onClick={() => void onConfirmReopen()}>Riapri</Button>
        </Dialog>
      ) : null}
    </Sheet>
  )
}
