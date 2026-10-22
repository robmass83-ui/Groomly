import { isNewerVersion } from './appRelease'

export type PushPrefs = {
  enabled: boolean
  updates: boolean
  complete: boolean
  completeAfterMin: number
}

export const DEFAULT_PUSH_PREFS: PushPrefs = {
  enabled: false,
  updates: true,
  complete: true,
  completeAfterMin: 60,
}

export type PushSend = {
  deviceId: string
  token: string
  kind: 'updates' | 'complete' | 'reminder'
  subject: string
  title: string
  body: string
  data: Record<string, string>
}

type PushAppointment = {
  id: string
  dogId: string
  status: string
  startMs: number
  durationMin: number
  personalTitle?: string
}

const REMINDER_LEAD_MS = 30 * 60 * 1000

export type SelectInput = {
  deviceId: string
  token: string
  appVersion: string
  delivered: string[]
  dogNames: Record<string, string>
  latestVersion: string | null
  nowMs: number
  prefs: PushPrefs
  appointments: PushAppointment[]
}

const ROME_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

type WallTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function romeWallTime(timestamp: number): WallTime {
  const values: Record<string, number> = {}
  for (const part of ROME_TIME.formatToParts(timestamp)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function romeWallToMs(wallMs: number): number {
  const offsets = new Set<number>()
  for (const dayOffset of [-2, -1, 0, 1, 2]) {
    const sample = Math.floor((wallMs + dayOffset * 24 * 60 * 60 * 1000) / 1000) * 1000
    const wall = romeWallTime(sample)
    const represented = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
    offsets.add(represented - sample)
  }

  const candidates = [...offsets].map((offset) => {
    const instant = wallMs - offset
    const wall = romeWallTime(instant)
    const represented = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second,
      instant % 1000,
    )
    return { instant, represented }
  })
  const exact = candidates
    .filter(({ represented }) => represented === wallMs)
    .sort((left, right) => left.instant - right.instant)
  if (exact[0]) return exact[0].instant

  const normalized = candidates
    .filter(({ represented }) => represented > wallMs)
    .sort((left, right) => left.represented - right.represented || left.instant - right.instant)
  return normalized[0]?.instant ?? wallMs
}

export function appointmentDueMs(startMs: number, durationMin: number, afterMin: number): number {
  const exactMs = startMs + durationMin * 60_000
  const exact = romeWallTime(exactMs)
  const exactMinutes = exact.hour * 60 + exact.minute + exact.second / 60 + (exactMs % 1000) / 60_000
  const roundedMinutes = Math.round(exactMinutes / 5) * 5
  const roundedWallMs = Date.UTC(exact.year, exact.month - 1, exact.day, 0, roundedMinutes)
  return romeWallToMs(roundedWallMs) + afterMin * 60_000
}

export function readPushPrefs(value: unknown): PushPrefs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_PUSH_PREFS
  const source = value as Partial<Record<keyof PushPrefs, unknown>>
  const completeAfterMin = typeof source.completeAfterMin === 'number' && Number.isFinite(source.completeAfterMin)
    ? Math.min(1440, Math.max(0, Math.round(source.completeAfterMin)))
    : DEFAULT_PUSH_PREFS.completeAfterMin
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_PUSH_PREFS.enabled,
    updates: typeof source.updates === 'boolean' ? source.updates : DEFAULT_PUSH_PREFS.updates,
    complete: typeof source.complete === 'boolean' ? source.complete : DEFAULT_PUSH_PREFS.complete,
    completeAfterMin,
  }
}

function deliveryPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_')
}

export function deliveryId(deviceId: string, kind: 'updates' | 'complete' | 'reminder', subject: string): string {
  return `${deliveryPart(deviceId)}__${kind}__${deliveryPart(subject)}`
}

export function reminderBody(): string {
  return 'Tra 30 minuti.'
}

export function completeBody(name: string | undefined): string {
  const subject = name?.trim() || 'un appuntamento'
  return `C’è da completare ${subject}: è passato il tempo dopo la fine dell’appuntamento.`
}

export function isNewerRelease(remote: string, local: string): boolean {
  return isNewerVersion(remote, local)
}

export function selectPushes(input: SelectInput): PushSend[] {
  if (!input.token.trim() || !input.prefs.enabled) return []

  const delivered = new Set(input.delivered)
  const sends: PushSend[] = []
  if (
    input.prefs.updates
    && input.latestVersion
    && isNewerRelease(input.latestVersion, input.appVersion)
    && !delivered.has(deliveryId(input.deviceId, 'updates', input.latestVersion))
  ) {
    sends.push({
      deviceId: input.deviceId,
      token: input.token,
      kind: 'updates',
      subject: input.latestVersion,
      title: 'Aggiornamento disponibile',
      body: `È pronta la versione ${input.latestVersion}.`,
      data: { type: 'update', version: input.latestVersion },
    })
  }

  for (const appointment of input.appointments) {
    const title = appointment.personalTitle?.trim()
    if (!title) continue
    const due = appointment.startMs - REMINDER_LEAD_MS
    if (
      due > input.nowMs
      || input.nowMs >= appointment.startMs
      || delivered.has(deliveryId(input.deviceId, 'reminder', appointment.id))
    ) continue
    sends.push({
      deviceId: input.deviceId,
      token: input.token,
      kind: 'reminder',
      subject: appointment.id,
      title,
      body: reminderBody(),
      data: {
        type: 'reminder',
        appointmentId: appointment.id,
        url: `/appuntamenti/personale/${appointment.id}`,
      },
    })
  }

  if (!input.prefs.complete) return sends
  const dayMs = 24 * 60 * 60 * 1000
  const dueAppointments = input.appointments
    .filter((appointment) => appointment.status === 'programmato')
    .map((appointment) => ({
      appointment,
      due: appointmentDueMs(
        appointment.startMs,
        appointment.durationMin,
        input.prefs.completeAfterMin,
      ),
    }))
    .filter(({ appointment, due }) => (
      due <= input.nowMs
      && input.nowMs - due <= dayMs
      && !delivered.has(deliveryId(input.deviceId, 'complete', appointment.id))
    ))
    .sort((left, right) => left.due - right.due || left.appointment.id.localeCompare(right.appointment.id))
    .slice(0, 8)

  for (const { appointment } of dueAppointments) {
    sends.push({
      deviceId: input.deviceId,
      token: input.token,
      kind: 'complete',
      subject: appointment.id,
      title: 'Da completare',
      body: completeBody(input.dogNames[appointment.dogId]),
      data: {
        type: 'complete',
        appointmentId: appointment.id,
        url: `/appuntamenti/${appointment.id}`,
      },
    })
  }
  return sends
}

export function appointmentsForPush<T extends { id: string }>(
  appointments: readonly T[],
  deletedIds: readonly string[] | null,
): T[] {
  if (deletedIds === null) return [...appointments]
  const gone = new Set(deletedIds.filter((id) => id.length > 0))
  return appointments.filter((item) => item.id.length > 0 && !gone.has(item.id))
}
