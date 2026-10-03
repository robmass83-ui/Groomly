import type { AgeCategory, ClientType, Dog, DogSize, DogStatus, Sex, Species, Temperament } from '../types/models'

export type DogTab = 'attivi' | 'mensili' | 'occasionali' | 'archivio'
export type DogChip = 'tutti' | 'mordaci' | 'anziani' | 'gatti'

export const SPECIES_LABEL: Record<Species, string> = { cane: 'Cane', gatto: 'Gatto', altro: 'Altro' }
export const SEX_LABEL: Record<Sex, string> = { M: 'Maschio', F: 'Femmina' }
export const AGE_LABEL: Record<AgeCategory, string> = { cucciolo: 'Cucciolo', giovane: 'Giovane', adulto: 'Adulto', anziano: 'Anziano' }
export const SIZE_LABEL: Record<DogSize, string> = { piccola: 'Piccola', media: 'Media', grande: 'Grande' }
export const TEMPERAMENT_LABEL: Record<Temperament, string> = { bravo: 'Bravo', agitato: 'Agitato', mordace: 'Mordace' }
export const CLIENT_LABEL: Record<ClientType, string> = { mensile: 'Mensile', occasionale: 'Occasionale' }
export const ARCHIVE_LABEL: Record<Exclude<DogStatus, 'attivo'>, string> = { non_in_cura: 'Non più in cura', deceduto: 'Deceduto' }

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function buildSearchKey(name: string, breed: string, contactName: string): string {
  return normalizeSearch([name, breed, contactName].join(' '))
}

export function dogMeta(dog: Dog): string {
  return [dog.breed.trim(), AGE_LABEL[dog.ageCategory], dog.contact.name.trim()].filter((part) => part !== '').join(' · ')
}

function inTab(dog: Dog, tab: DogTab): boolean {
  if (tab === 'archivio') return dog.status === 'non_in_cura' || dog.status === 'deceduto'
  if (dog.status !== 'attivo') return false
  if (tab === 'mensili') return dog.clientType === 'mensile'
  if (tab === 'occasionali') return dog.clientType === 'occasionale'
  return true
}

function inChip(dog: Dog, chip: DogChip): boolean {
  if (chip === 'mordaci') return dog.temperament === 'mordace'
  if (chip === 'anziani') return dog.ageCategory === 'anziano'
  if (chip === 'gatti') return dog.species === 'gatto'
  return true
}

export function countDogs(dogs: Dog[]): { attivi: number; mensili: number; occasionali: number; archivio: number } {
  return {
    attivi: dogs.filter((dog) => inTab(dog, 'attivi')).length,
    mensili: dogs.filter((dog) => inTab(dog, 'mensili')).length,
    occasionali: dogs.filter((dog) => inTab(dog, 'occasionali')).length,
    archivio: dogs.filter((dog) => inTab(dog, 'archivio')).length,
  }
}

export function visibleDogs(dogs: Dog[], tab: DogTab, chip: DogChip, query: string): Dog[] {
  const normalized = normalizeSearch(query)
  return dogs.filter((dog) => {
    if (!inTab(dog, tab)) return false
    if (!inChip(dog, chip)) return false
    if (!normalized) return true
    return dog.searchKey.includes(normalized)
  })
}
