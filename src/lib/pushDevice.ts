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

/** Avvisi del salone con nomi di animali e orari: push arrivate, compleanni e orario scaduto programmati dall'app. */
const TIPI_DEL_SALONE = new Set(['complete', 'reminder', 'compleanno', 'orario-scaduto'])

/**
 * Gli avvisi da togliere dal telefono: quelli di un altro salone o, con salonId vuoto (uscita), tutti quelli del salone.
 * L'avviso di aggiornamento resta. Compleanni e orario scaduto delle versioni prima avevano solo `path`:
 * si tolgono all'uscita, mentre all'avvio li riprogramma l'app.
 */
export function pushLocaleDaTogliere(
  notifications: { id: number; extra?: unknown }[],
  salonId: string,
): number[] {
  return notifications.flatMap((item) => {
    const extra = item.extra
    if (!extra || typeof extra !== 'object') return []
    const data = extra as { type?: unknown; salonId?: unknown; path?: unknown }
    if (data.type === undefined && typeof data.path === 'string') return salonId === '' ? [item.id] : []
    if (typeof data.type !== 'string' || !TIPI_DEL_SALONE.has(data.type)) return []
    if (typeof data.salonId === 'string' && data.salonId === salonId) return []
    return [item.id]
  })
}
