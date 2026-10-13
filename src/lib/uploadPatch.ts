function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isRemoteUrl(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('data:')
}

function copyWithoutDataUrls(value: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && item.startsWith('data:')) continue
    next[key] = item
  }
  return next
}

export interface GalleryUrl {
  id: string
  photo: string
  takenAt?: number
}

export interface WorkPhotoUrl {
  id: string
  photo: string
  kind?: string
}

export interface PriceUrl {
  id: string
  dataUrl: string
}

/**
 * Aggiornamento parziale: solo la foto profilo e gli URL della galleria.
 * Nome e gli altri campi del documento corrente non entrano nel risultato.
 */
export function dogMediaPatch(
  current: Record<string, unknown>,
  uploaded: { photo?: string; gallery: GalleryUrl[] },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (isRemoteUrl(uploaded.photo)) patch.photo = uploaded.photo

  const remoteGallery = uploaded.gallery.filter((item) => item.id && isRemoteUrl(item.photo))
  if (remoteGallery.length === 0) return patch

  const gallery = Array.isArray(current.gallery)
    ? current.gallery.filter(isRecord).map((item) => copyWithoutDataUrls(item))
    : []
  for (const item of remoteGallery) {
    const index = gallery.findIndex((entry) => entry.id === item.id)
    if (index >= 0) {
      gallery[index] = { ...gallery[index], photo: item.photo }
      continue
    }
    const created: Record<string, unknown> = { id: item.id, photo: item.photo }
    if (typeof item.takenAt === 'number') created.takenAt = item.takenAt
    gallery.push(created)
  }
  patch.gallery = gallery
  return patch
}

/**
 * Aggiornamento parziale: solo le foto del lavoro già finite.
 * Servizi, stile e gli altri campi del documento corrente restano fuori.
 */
export function appointmentMediaPatch(
  current: Record<string, unknown>,
  uploaded: WorkPhotoUrl[],
): Record<string, unknown> {
  const remote = uploaded.filter((item) => item.id && isRemoteUrl(item.photo))
  if (remote.length === 0) return {}
  const photos = Array.isArray(current.photos)
    ? current.photos.filter(isRecord).map((item) => copyWithoutDataUrls(item))
    : []
  for (const item of remote) {
    const index = photos.findIndex((entry) => entry.id === item.id)
    if (index >= 0) {
      photos[index] = { ...photos[index], photo: item.photo }
      continue
    }
    const created: Record<string, unknown> = { id: item.id, photo: item.photo }
    if (item.kind === 'prima' || item.kind === 'dopo' || item.kind === 'altro') created.kind = item.kind
    photos.push(created)
  }
  return { photos }
}

/**
 * Aggiornamento parziale: solo il dataUrl dei file il cui id è ancora sul documento.
 * Tema, attività, etichette e backup non entrano nel risultato.
 */
export function settingsMediaPatch(
  current: Record<string, unknown>,
  uploaded: PriceUrl[],
): Record<string, unknown> {
  const urls = new Map<string, string>()
  for (const file of uploaded) {
    if (!file.id || !isRemoteUrl(file.dataUrl)) continue
    urls.set(file.id, file.dataUrl)
  }
  if (urls.size === 0) return {}

  const patch: Record<string, unknown> = {}
  if (isRecord(current.priceList) && typeof current.priceList.id === 'string') {
    const url = urls.get(current.priceList.id)
    if (url) patch['priceList.dataUrl'] = url
  }

  if (Array.isArray(current.priceListHistory)) {
    let changed = false
    const history = current.priceListHistory.filter(isRecord).map((item) => {
      const next = copyWithoutDataUrls(item)
      if (typeof next.id === 'string') {
        const url = urls.get(next.id)
        if (url && next.dataUrl !== url) {
          next.dataUrl = url
          changed = true
        }
      }
      return next
    })
    if (changed) patch.priceListHistory = history
  }

  const logoUrl = urls.get('priceSheet-logo')
  if (logoUrl && isRecord(current.priceSheet)) {
    const header = current.priceSheet.intestazione
    if (isRecord(header) && typeof header.logo === 'string' && header.logo.length > 0) {
      patch['priceSheet.intestazione.logo'] = logoUrl
    }
  }
  return patch
}

/** Solo `backup.lastAt`. Non sostituisce backup con `{ autoDaily, lastAt }` e non scrive snapshot. */
export function backupLastAtPatch(lastAt: string): Record<string, unknown> {
  return { 'backup.lastAt': lastAt }
}
