import {
  readPushPrefs,
  selectPushes,
  type PushPrefs,
  type PushSend,
} from '../../src/lib/pushDue'
import { releaseFromGithub } from '../../src/lib/appRelease'

const MINUTE_MS = 60 * 1000
const DELIVERY_CLAIM_MS = 4 * MINUTE_MS

export type PushDevice = {
  id: string
  token: string
  appVersion: string
}

export type PushAppointment = {
  id: string
  dogId: string
  status: string
  startMs: number
  durationMin: number
}

export type PushLoad = {
  accountIds(): Promise<string[]>
  prefs(uid: string): Promise<unknown>
  devices(uid: string): Promise<PushDevice[]>
  appointments(): Promise<PushAppointment[]>
  dogName(dogId: string): Promise<string>
  delivered(deviceId: string): Promise<string[]>
  latestVersion(): Promise<string | null>
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
  return {
    id,
    dogId: text(value.dogId),
    status: text(value.status),
    startMs: typeof value.start === 'number' ? value.start : 0,
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

export async function collectSends(load: PushLoad, nowMs: number): Promise<PushSend[]> {
  const [accountIds, appointments, latestVersion] = await Promise.all([
    load.accountIds(),
    load.appointments(),
    load.latestVersion(),
  ])
  const dogNames: Record<string, string> = {}
  await Promise.all([...new Set(appointments.map((appointment) => appointment.dogId))].map(async (dogId) => {
    dogNames[dogId] = await load.dogName(dogId)
  }))

  const sends: PushSend[] = []
  for (const uid of accountIds) {
    const [prefsValue, devices] = await Promise.all([load.prefs(uid), load.devices(uid)])
    const prefs: PushPrefs = readPushPrefs(prefsValue)
    for (const device of devices) {
      sends.push(...selectPushes({
        deviceId: device.id,
        token: device.token,
        appVersion: device.appVersion,
        delivered: await load.delivered(device.id),
        dogNames,
        latestVersion,
        nowMs,
        prefs,
        appointments,
      }))
    }
  }
  return sends
}
