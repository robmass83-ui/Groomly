import {
  appointmentDueMs,
  deliveryId,
  readPushPrefs,
  selectPushes,
  type PushPrefs,
  type PushSend,
} from '../../src/lib/pushDue'
import { linguaValida, type Lingua } from '../../src/i18n/lingua'
import { releaseFromGithub } from '../../src/lib/appRelease'

export { appointmentsForPush } from '../../src/lib/pushDue'

const MINUTE_MS = 60 * 1000
const REMINDER_LEAD_MS = 30 * MINUTE_MS
const DAY_MS = 24 * 60 * MINUTE_MS
const MAX_COMPLETE_AFTER_MS = 1440 * MINUTE_MS
const DELIVERY_CLAIM_MS = 4 * MINUTE_MS

export type PushDevice = {
  id: string
  token: string
  appVersion: string
  updatedAt?: string
}

export type StalePushDevice = {
  uid: string
  deviceId: string
  token: string
}

type PushRegistration = {
  uid: string
  salonId: string
  deviceId: string
  token: string
  updatedAt: string
}

export type PushAppointment = {
  id: string
  dogId: string
  status: string
  startMs: number
  durationMin: number
  personalTitle?: string
}

export type PushLoad = {
  accountIds(): Promise<string[]>
  account(uid: string): Promise<{ salonId: string; lingua?: string } | null>
  prefs(uid: string): Promise<unknown>
  devices(uid: string): Promise<PushDevice[]>
  appointments(salonId: string): Promise<PushAppointment[]>
  dogName(salonId: string, dogId: string): Promise<string>
  delivered(
    deviceId: string,
    appointments: PushAppointment[],
    nowMs: number,
    latestVersion: string | null,
  ): Promise<string[]>
  latestVersion(): Promise<string | null>
  dimentica?(refs: StalePushDevice[]): Promise<void>
}

export function telefoniDelLogin(rows: PushRegistration[]): {
  attivi: PushRegistration[]
  vecchi: StalePushDevice[]
} {
  const byToken = new Map<string, PushRegistration[]>()
  for (const row of rows) {
    const token = row.token.trim()
    if (!token) continue
    const list = byToken.get(token) ?? []
    list.push({ ...row, token })
    byToken.set(token, list)
  }
  const attivi: PushRegistration[] = []
  const vecchi: StalePushDevice[] = []
  for (const group of byToken.values()) {
    if (group.length === 1) {
      attivi.push(group[0])
      continue
    }
    const sorted = [...group].sort((left, right) => {
      const byTime = right.updatedAt.localeCompare(left.updatedAt)
      if (byTime !== 0) return byTime
      return left.deviceId.localeCompare(right.deviceId)
    })
    const best = sorted[0]
    if (!best.updatedAt) continue
    const winner = sorted.find((row) => row.updatedAt === best.updatedAt && row.salonId === best.salonId) ?? best
    attivi.push(winner)
    for (const row of group) {
      if (row.uid === winner.uid && row.deviceId === winner.deviceId) continue
      vecchi.push({ uid: row.uid, deviceId: row.deviceId, token: row.token })
    }
  }
  return { attivi, vecchi }
}

export function dispositiviDaRilasciare(
  uid: string,
  deviceId: string,
  token: string,
  tieni: boolean,
  trovati: { uid: string; deviceId: string; token: string }[],
): { uid: string; deviceId: string }[] {
  return trovati.flatMap((item) => {
    if (item.token !== token || !item.token) return []
    if (item.uid !== uid) {
      if (!tieni) return []
      return [{ uid: item.uid, deviceId: item.deviceId }]
    }
    if (!tieni || item.deviceId !== deviceId) return [{ uid: item.uid, deviceId: item.deviceId }]
    return []
  })
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function versionFromGithub(payload: unknown): string | null {
  const release = releaseFromGithub(payload)
  if (!release || !payload || typeof payload !== 'object') return null
  const assets = (payload as { assets?: unknown }).assets
  if (!Array.isArray(assets)) return null
  const groomlyApk = assets.some((asset) => {
    if (!asset || typeof asset !== 'object') return false
    const value = asset as { name?: unknown; browser_download_url?: unknown }
    return typeof value.name === 'string'
      && value.name === 'groomly.apk'
      && typeof value.browser_download_url === 'string'
      && value.browser_download_url.length > 0
  })
  return groomlyApk ? release.version : null
}

export function appointmentFromDoc(id: string, value: Record<string, unknown>): PushAppointment {
  const services = Array.isArray(value.services) ? value.services : []
  const durationMin = services.reduce((total, service) => {
    if (!service || typeof service !== 'object') return total
    const duration = (service as { durationMin?: unknown }).durationMin
    return total + (typeof duration === 'number' && Number.isFinite(duration) ? duration : 0)
  }, 0)
  const startMs = typeof value.start === 'number' ? value.start : 0
  if (value.kind === 'personale') {
    return {
      id,
      dogId: '',
      status: '',
      startMs,
      durationMin: 0,
      personalTitle: text(value.title) || 'Appuntamento personale',
    }
  }
  return {
    id,
    dogId: text(value.dogId),
    status: text(value.status),
    startMs,
    durationMin,
  }
}

export function deliverySlot(data: unknown, nowMs: number): 'free' | 'done' | 'busy' | 'stale' {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'free'
  const value = data as { at?: unknown; claim?: unknown }
  if (typeof value.at === 'number' && Number.isFinite(value.at)) return 'done'
  if (
    typeof value.claim === 'number'
    && Number.isFinite(value.claim)
    && value.claim > nowMs - DELIVERY_CLAIM_MS
  ) return 'busy'
  return 'stale'
}

export function deliveryCandidateIds(
  deviceId: string,
  appointments: PushAppointment[],
  nowMs: number,
  latestVersion: string | null,
): string[] {
  const ids: string[] = []
  if (latestVersion) ids.push(deliveryId(deviceId, 'updates', latestVersion))
  for (const appointment of appointments) {
    const end = appointmentDueMs(appointment.startMs, appointment.durationMin, 0)
    if (end <= nowMs && end > nowMs - DAY_MS - MAX_COMPLETE_AFTER_MS) {
      ids.push(deliveryId(deviceId, 'complete', appointment.id))
    }
    if (
      appointment.personalTitle
      && appointment.startMs > nowMs
      && appointment.startMs - REMINDER_LEAD_MS <= nowMs
    ) {
      ids.push(deliveryId(deviceId, 'reminder', appointment.id))
    }
  }
  return ids
}

export async function collectSends(load: PushLoad, nowMs: number): Promise<PushSend[]> {
  const [accountIds, latestVersion] = await Promise.all([
    load.accountIds(),
    load.latestVersion(),
  ])
  const membersBySalon = new Map<string, { uid: string; lingua: Lingua }[]>()
  const rows: PushRegistration[] = []
  const devicesByUid = new Map<string, PushDevice[]>()
  for (const uid of accountIds) {
    const account = await load.account(uid)
    const salonId = account?.salonId ?? ''
    const lingua: Lingua = linguaValida(account?.lingua) ?? 'it'
    if (salonId === '' || salonId === 'shared' || salonId.includes('/')) continue
    const members = membersBySalon.get(salonId)
    const member = { uid, lingua }
    if (members) members.push(member)
    else membersBySalon.set(salonId, [member])
    const devices = await load.devices(uid)
    devicesByUid.set(uid, devices)
    for (const device of devices) {
      rows.push({
        uid,
        salonId,
        deviceId: device.id,
        token: device.token,
        updatedAt: device.updatedAt ?? '',
      })
    }
  }
  const { attivi, vecchi } = telefoniDelLogin(rows)
  if (vecchi.length > 0 && load.dimentica) await load.dimentica(vecchi)
  const activeKey = new Set(attivi.map((row) => `${row.uid}\n${row.deviceId}`))

  const sends: PushSend[] = []
  for (const [salonId, members] of membersBySalon) {
    const appointments = await load.appointments(salonId)
    const dogNames: Record<string, string> = {}
    await Promise.all([...new Set(appointments.map((appointment) => appointment.dogId))].map(async (dogId) => {
      dogNames[dogId] = await load.dogName(salonId, dogId)
    }))
    for (const member of members) {
      const prefs: PushPrefs = readPushPrefs(await load.prefs(member.uid))
      const devices = (devicesByUid.get(member.uid) ?? [])
        .filter((device) => activeKey.has(`${member.uid}\n${device.id}`))
      for (const device of devices) {
        sends.push(...selectPushes({
          deviceId: device.id,
          token: device.token,
          appVersion: device.appVersion,
          delivered: await load.delivered(device.id, appointments, nowMs, latestVersion),
          dogNames,
          latestVersion,
          nowMs,
          prefs,
          appointments,
          lingua: member.lingua,
          salonId,
        }))
      }
    }
  }
  return sends
}
