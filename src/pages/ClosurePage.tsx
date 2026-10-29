import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { dataBreve } from '../i18n/format'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import type { Lingua } from '../i18n/lingua'
import { Dialog } from '../components/layout/Dialog'
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

type Mode = 'giorno' | 'periodo'

function homeDay(day: string, lingua: Lingua): string {
  const data = parseDayParam(day, new Date())
  return lingua === 'it' ? formatHomeDate(data) : dataBreve(lingua, data)
}

function overlapMessage(hit: Closure, lingua: Lingua): string {
  if (hit.startDay === hit.endDay) return t(lingua, 'chiusuraGiornoChiuso', { motivo: hit.reason })
  return t(lingua, 'chiusuraGiorniChiusi', { motivo: hit.reason, dal: homeDay(hit.startDay, lingua), al: homeDay(hit.endDay, lingua) })
}

function visitMessage(count: number, lingua: Lingua): string {
  if (count === 1) return t(lingua, 'chiusuraVisitaUno')
  return t(lingua, 'chiusuraVisite', { n: count })
}

function reopenMessage(item: Closure, lingua: Lingua): string {
  if (item.startDay === item.endDay) return t(lingua, 'chiusuraRiapriGiorno')
  return t(lingua, 'chiusuraRiapriPeriodo', { dal: homeDay(item.startDay, lingua), al: homeDay(item.endDay, lingua) })
}

function rangeOk(start: string, end: string): boolean {
  return DAY.test(start) && DAY.test(end) && closureRangeOk(start, end)
}

export function ClosurePage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  // Il collaboratore legge la chiusura: salvarla o riaprirla spetta a titolare e socio.
  const solaLettura = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
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
    if (next === mode) return
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
    setReasonError(reasonValid ? null : frasi.chiusuraMotivoManca)
    setRangeError(datesValid ? null : frasi.chiusuraFine)
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
    <Dialog open title={frasi.chiusuraTitolo} onClose={closeSheet}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!solaLettura) void onSave()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <fieldset disabled={solaLettura} style={{ display: 'flex', flexDirection: 'column', gap: 12, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Input label={frasi.chiusuraMotivo} value={reason} autoComplete="off" onChange={(event) => setReason(event.target.value)} error={reasonError ?? undefined} />
        <Segmented<Mode>
          fill
          label={frasi.servDurata}
          value={mode}
          onChange={choose}
          options={[
            { value: 'giorno', label: frasi.chiusuraQuestoGiorno },
            { value: 'periodo', label: frasi.chiusuraPeriodo },
          ]}
        />
        {single ? (
          <Input label={frasi.persData} type="date" value={day} onChange={(event) => setDay(event.target.value)} error={rangeError ?? undefined} />
        ) : (
          <>
            <Input label={frasi.chiusuraDal} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input label={frasi.chiusuraAl} type="date" value={to} onChange={(event) => setTo(event.target.value)} error={rangeError ?? undefined} />
          </>
        )}
        </fieldset>
        {solaLettura ? null : <Button type="submit" style={{ width: '100%' }}>{frasi.schedaSalva}</Button>}
        {existing && !solaLettura ? (
          <Button type="button" variant="bad" onClick={() => setConfirming(true)} style={{ width: '100%' }}>{frasi.chiusuraRiapri}</Button>
        ) : null}
      </form>
      {overlap ? (
        <Dialog open title={overlapMessage(overlap, lingua)} onClose={() => setOverlap(null)}>
          <Button type="button" variant="ghost" onClick={() => setOverlap(null)}>{frasi.homeIndietro}</Button>
          <Button
            type="button"
            onClick={() => {
              const targetId = overlap.id
              setOverlap(null)
              navigate(`/chiusure/${targetId}`, { replace: true, state: location.state })
            }}
          >
            {frasi.homeApri}
          </Button>
        </Dialog>
      ) : null}
      {pending && visitCount > 0 ? (
        <Dialog open title={visitMessage(visitCount, lingua)} onClose={() => { setPending(null); setVisitCount(0) }}>
          <Button type="button" variant="ghost" onClick={() => { setPending(null); setVisitCount(0) }}>{frasi.homeIndietro}</Button>
          <Button type="button" onClick={() => void persist(pending)}>{frasi.schedaSalva}</Button>
        </Dialog>
      ) : null}
      {existing && confirming ? (
        <Dialog open title={reopenMessage(existing, lingua)} onClose={() => setConfirming(false)}>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>{frasi.homeAnnulla}</Button>
          <Button type="button" variant="bad" onClick={() => void onConfirmReopen()}>{frasi.chiusuraRiapri}</Button>
        </Dialog>
      ) : null}
    </Dialog>
  )
}
