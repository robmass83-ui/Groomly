import type { CustomField, Dog, DogContact, DogSize, GalleryPhoto } from '../types/models'

export interface DogFormSeed {
  contacts: DogContact[]
  tags: string[]
  customFields: CustomField[]
  gallery: GalleryPhoto[]
  birthYearInput: string
  weightInput: string
  isSenior: boolean
  size: DogSize
  hiddenServiceIds: string[]
}

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
    isSenior: dog?.isSenior ?? dog?.ageCategory === 'anziano',
    size: dog?.size ?? 'piccola',
    hiddenServiceIds: dog ? [...dog.hiddenServiceIds] : [],
  }
}
