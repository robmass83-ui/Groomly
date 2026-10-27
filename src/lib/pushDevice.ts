const PUSH_DEVICE_KEY = 'groomly.pushDevice'
export const PUSH_TOKEN_KEY = 'groomly.pushToken'

export function pushDeviceId(): string {
  const saved = localStorage.getItem(PUSH_DEVICE_KEY)
  if (saved) return saved
  const created = crypto.randomUUID()
  localStorage.setItem(PUSH_DEVICE_KEY, created)
  return created
}

export function shouldScheduleLocalUpdate(pushUpdates: boolean, hasToken: boolean): boolean {
  return !pushUpdates || !hasToken
}

export function pushTapPath(data: Record<string, string>, salonId = ''): string | null {
  if ((data.type !== 'complete' && data.type !== 'reminder') || !data.url?.startsWith('/appuntamenti/')) return null
  if (data.salonId && data.salonId !== salonId) return null
  return data.url
}

export function pushDelSalone(data: Record<string, string>, salonId: string): boolean {
  if (data.type !== 'complete' && data.type !== 'reminder') return true
  if (!data.salonId) return true
  return data.salonId === salonId
}

export function pushLocaleDaTogliere(
  notifications: { id: number; extra?: unknown }[],
  salonId: string,
): number[] {
  return notifications.flatMap((item) => {
    const extra = item.extra
    if (!extra || typeof extra !== 'object') return []
    const data = extra as { type?: unknown; salonId?: unknown }
    if (data.type !== 'complete' && data.type !== 'reminder') return []
    if (typeof data.salonId === 'string' && data.salonId === salonId) return []
    return [item.id]
  })
}
