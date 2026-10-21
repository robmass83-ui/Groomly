const PUSH_DEVICE_KEY = 'groomly.pushDevice'

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

export function pushTapPath(data: Record<string, string>): string | null {
  if ((data.type !== 'complete' && data.type !== 'reminder') || !data.url?.startsWith('/appuntamenti/')) return null
  return data.url
}
