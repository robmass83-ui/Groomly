import type { CustomField, Dog, DogContact, DogSize, GalleryPhoto } from '../types/models'
import type { DogScreen } from './dogScreen'

export interface DogFormSeed {
  contacts: DogContact[]
  tags: string[]
  customFields: CustomField[]
  gallery: GalleryPhoto[]
  birthYearInput: string
  weightInput: string
  size: DogSize
  hiddenServiceIds: string[]
}

const DEFAULT_RECURRENCE_WEEKS = 4

function weightText(kg: number | undefined): string {
  if (kg == null) return ''
  return String(kg).replace('.', ',')
}

export function shouldReseedDog(seededId: string | null, routeId: string | undefined, loadedDogId: string | undefined): boolean {
  if (!routeId || loadedDogId !== routeId) return false
  return seededId !== routeId
}

export function dogFormSeed(dog: Dog | undefined): DogFormSeed {
  return {
    contacts: dog?.contacts.map((contact) => ({ ...contact })) ?? [],
    tags: dog ? [...dog.tags] : [],
    customFields: dog?.customFields.map((field) => ({ ...field })) ?? [],
    gallery: dog?.gallery.map((item) => ({ ...item })) ?? [],
    birthYearInput: dog?.birthYear != null ? String(dog.birthYear) : '',
    weightInput: weightText(dog?.weightKg),
    size: dog?.size ?? 'piccola',
    hiddenServiceIds: dog ? [...dog.hiddenServiceIds] : [],
  }
}

export function dogScreenSeed(dog: Dog | undefined, arrivalName?: string): DogScreen {
  const seed = dogFormSeed(dog)
  const screen: DogScreen = {
    species: dog?.species ?? 'cane',
    breed: dog?.breed ?? '',
    ageCategory: dog?.ageCategory ?? 'adulto',
    size: seed.size,
    temperament: dog?.temperament ?? 'bravo',
    clientType: dog?.clientType ?? 'occasionale',
    name: dog?.name ?? arrivalName?.trim() ?? '',
    owner: dog?.contact.name ?? '',
    phone: dog?.contact.phone ?? '',
    notes: dog?.notes ?? '',
    criticalNote: dog?.criticalNote ?? '',
    birthYear: seed.birthYearInput,
    weight: seed.weightInput,
    recurrenceWeeks: dog?.recurrenceWeeks ?? DEFAULT_RECURRENCE_WEEKS,
  }
  if (dog?.sex) screen.sex = dog.sex
  return screen
}
