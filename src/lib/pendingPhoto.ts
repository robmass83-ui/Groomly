import type { PriceFile, SettingsMain } from '../data/local/settings'
import type { Appointment, Dog } from '../types/models'

function isDataUrl(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('data:')
}

function isRemote(value: string | undefined): boolean {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('data:')
}

export function mergePendingDog(incoming: Dog, previous: Dog | undefined): Dog {
  if (!previous) return incoming
  const photo = isDataUrl(previous.photo) && !isRemote(incoming.photo) ? previous.photo : incoming.photo
  const incomingIds = new Set(incoming.gallery.map((item) => item.id))
  const gallery = incoming.gallery.map((item) => {
    const old = previous.gallery.find((entry) => entry.id === item.id)
    if (old && isDataUrl(old.photo) && !isRemote(item.photo)) return { ...item, photo: old.photo }
    return item
  })
  for (const old of previous.gallery) {
    if (isDataUrl(old.photo) && !incomingIds.has(old.id)) gallery.push(old)
  }
  if (photo === incoming.photo && gallery.length === incoming.gallery.length && gallery.every((item, index) => item === incoming.gallery[index])) {
    return incoming
  }
  return { ...incoming, photo, gallery }
}

interface PendingMedia {
  photo?: string
  gallery: { id: string; photo: string; takenAt: string }[]
}

const queuedUploads = new Set<string>()

function pendingKey(uid: string): string {
  return `groomly.pending-photos.${uid}`
}

/** Toglie il secchio delle foto in attesa di un uid, e le richieste di caricamento già accodate per lui. */
export function discardPendingPhotos(uid: string): void {
  if (!uid) return
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(pendingKey(uid))
    } catch {
      // Non c'è altro da fare se lo spazio locale non risponde.
    }
  }
  for (const signature of [...queuedUploads]) {
    if (signature.startsWith(`${uid}:`)) queuedUploads.delete(signature)
  }
}

function mediaOf(dog: Pick<Dog, 'photo' | 'gallery'>): PendingMedia | null {
  const photo = isDataUrl(dog.photo) ? dog.photo : undefined
  const gallery = dog.gallery.flatMap((item) => {
    if (!isDataUrl(item.photo)) return []
    return [{ id: item.id, photo: item.photo, takenAt: item.takenAt.toISOString() }]
  })
  if (!photo && gallery.length === 0) return null
  return { photo, gallery }
}

function sameMedia(left: PendingMedia | undefined, right: PendingMedia): boolean {
  if (!left) return false
  if (left.photo !== right.photo || left.gallery.length !== right.gallery.length) return false
  return left.gallery.every((item, index) => item.id === right.gallery[index]?.id && item.photo === right.gallery[index]?.photo)
}

function readBucket(uid: string): Map<string, PendingMedia> {
  const bucket = new Map<string, PendingMedia>()
  if (typeof localStorage === 'undefined') return bucket
  const raw = localStorage.getItem(pendingKey(uid))
  if (!raw) return bucket
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return bucket
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const record = value as { photo?: unknown; gallery?: unknown }
      const rawPhoto = typeof record.photo === 'string' ? record.photo : undefined
      const photo = isDataUrl(rawPhoto) ? rawPhoto : undefined
      const gallery = Array.isArray(record.gallery)
        ? record.gallery.flatMap((item) => {
          if (!item || typeof item !== 'object') return []
          const entry = item as { id?: unknown; photo?: unknown; takenAt?: unknown }
          if (typeof entry.id !== 'string' || !isDataUrl(typeof entry.photo === 'string' ? entry.photo : undefined)) return []
          const takenAt = typeof entry.takenAt === 'string' ? entry.takenAt : new Date(0).toISOString()
          return [{ id: entry.id, photo: entry.photo as string, takenAt }]
        })
        : []
      if (!photo && gallery.length === 0) continue
      bucket.set(id, { photo, gallery })
    }
  } catch {
    return new Map()
  }
  return bucket
}

function writeBucket(uid: string, bucket: Map<string, PendingMedia>): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (bucket.size === 0) {
      localStorage.removeItem(pendingKey(uid))
      return
    }
    localStorage.setItem(pendingKey(uid), JSON.stringify(Object.fromEntries(bucket)))
  } catch {
    return
  }
}

function dogWithMedia(dog: Dog, media: PendingMedia): Dog {
  return {
    ...dog,
    photo: media.photo,
    gallery: media.gallery.map((item) => ({ id: item.id, photo: item.photo, takenAt: new Date(item.takenAt) })),
  }
}

export function rememberPendingDog(uid: string, dog: Dog): void {
  if (!uid) return
  const bucket = readBucket(uid)
  const media = mediaOf(dog)
  if (!media) bucket.delete(dog.id)
  else bucket.set(dog.id, media)
  writeBucket(uid, bucket)
}

export function mergePendingDogs(incoming: Dog[], previous: Dog[], uid = ''): Dog[] {
  const bucket = uid ? readBucket(uid) : new Map<string, PendingMedia>()
  const byId = new Map(previous.map((dog) => [dog.id, dog]))
  let changed = false
  const result = incoming.map((dog) => {
    const stored = bucket.get(dog.id)
    const withStore = stored ? mergePendingDog(dog, dogWithMedia(dog, stored)) : dog
    const merged = mergePendingDog(withStore, byId.get(dog.id))
    const next = mediaOf(merged)
    if (stored && !next) {
      bucket.delete(dog.id)
      changed = true
    } else if (next && !sameMedia(stored, next)) {
      bucket.set(dog.id, next)
      changed = true
    }
    return merged
  })
  if (changed && uid) writeBucket(uid, bucket)
  return result
}

function uploadSignature(uid: string, dog: Dog): string {
  const photo = isDataUrl(dog.photo) ? dog.photo : ''
  const gallery = dog.gallery.filter((item) => isDataUrl(item.photo)).map((item) => `${item.id}:${item.photo}`).join('|')
  return `${uid}:${dog.id}:${photo}:${gallery}`
}

export function claimDogUpload(uid: string, dog: Dog): boolean {
  if (!mediaOf(dog)) return false
  const signature = uploadSignature(uid, dog)
  if (queuedUploads.has(signature)) return false
  queuedUploads.add(signature)
  return true
}

export function resetPendingUploads(): void {
  queuedUploads.clear()
}

export function mergePendingAppointment(incoming: Appointment, previous: Appointment | undefined): Appointment {
  if (!previous?.photos?.length) return incoming
  const incomingPhotos = incoming.photos ?? []
  const incomingIds = new Set(incomingPhotos.map((item) => item.id))
  const photos = incomingPhotos.map((item) => {
    const old = previous.photos?.find((entry) => entry.id === item.id)
    if (old && isDataUrl(old.photo) && !isRemote(item.photo)) return { ...item, photo: old.photo }
    return item
  })
  for (const old of previous.photos) {
    if (isDataUrl(old.photo) && !incomingIds.has(old.id)) photos.push(old)
  }
  if (photos.length === incomingPhotos.length && photos.every((item, index) => item === incomingPhotos[index])) {
    return incoming
  }
  return { ...incoming, photos }
}

export function mergePendingAppointments(incoming: Appointment[], previous: Appointment[]): Appointment[] {
  const byId = new Map(previous.map((item) => [item.id, item]))
  return incoming.map((item) => mergePendingAppointment(item, byId.get(item.id)))
}

function mergeFile(incoming: PriceFile | undefined, previous: PriceFile | undefined): PriceFile | undefined {
  if (incoming && previous && incoming.id === previous.id && isDataUrl(previous.dataUrl) && !isRemote(incoming.dataUrl)) {
    return { ...incoming, dataUrl: previous.dataUrl }
  }
  if (!incoming && previous && isDataUrl(previous.dataUrl)) return previous
  return incoming
}

export function mergePendingSettings(incoming: SettingsMain, previous: SettingsMain): SettingsMain {
  const historyIds = new Set(incoming.priceListHistory.map((file) => file.id))
  const previousById = new Map(previous.priceListHistory.map((file) => [file.id, file]))
  const priceListHistory = incoming.priceListHistory.map((file) => mergeFile(file, previousById.get(file.id)) ?? file)
  for (const file of previous.priceListHistory) {
    if (isDataUrl(file.dataUrl) && !historyIds.has(file.id)) priceListHistory.push(file)
  }
  return {
    ...incoming,
    priceList: mergeFile(incoming.priceList, previous.priceList),
    priceListHistory,
    priceSheet: mergeLogo(incoming, previous),
  }
}

function eta(value: string): number {
  const at = Date.parse(value)
  return Number.isFinite(at) ? at : 0
}

// Il logo appena scelto resta finché il cloud non manda una copia nuova quanto la nostra:
// una copia più vecchia arrivata durante il caricamento lo cancellerebbe, e il salvataggio dopo pure.
function mergeLogo(incoming: SettingsMain, previous: SettingsMain): SettingsMain['priceSheet'] {
  const logo = previous.priceSheet?.intestazione.logo
  if (!isDataUrl(logo) || eta(incoming.updatedAt) >= eta(previous.updatedAt)) return incoming.priceSheet
  const sheet = incoming.priceSheet ?? previous.priceSheet
  if (!sheet) return incoming.priceSheet
  return { ...sheet, intestazione: { ...sheet.intestazione, logo } }
}
