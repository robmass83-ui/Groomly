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

export function mergePendingDogs(incoming: Dog[], previous: Dog[]): Dog[] {
  const byId = new Map(previous.map((dog) => [dog.id, dog]))
  return incoming.map((dog) => mergePendingDog(dog, byId.get(dog.id)))
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
  }
}
