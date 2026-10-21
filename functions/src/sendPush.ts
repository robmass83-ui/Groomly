import {
  readPushPrefs,
  selectPushes,
  type PushPrefs,
  type PushSend,
} from '../../src/lib/pushDue'

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
