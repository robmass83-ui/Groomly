import { format, isSameDay } from 'date-fns'
import type { AgeCategory, Appointment, ClientType, Dog, DogSize, DogStatus, Sex, Species, Temperament } from '../types/models'
import { nextAppointment } from './appointments'
import { dueSoon } from './cycle'
import { ageText, shortOwner } from './display'
import { IT_DATE } from './format'

export type DogTab = 'attivi' | 'mensili' | 'occasionali' | 'archivio'
export type DogChip = 'tutti' | 'mordaci' | 'anziani' | 'in_agenda' | 'gatti'
export type DogSort = 'alfabetico' | 'prossimo'

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

function birthYearOf(dog: Dog): number | undefined {
  const value = (dog as { birthYear?: unknown }).birthYear
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function dogSubtitle(dog: Dog, now: Date): string {
  const age = ageText(birthYearOf(dog), AGE_LABEL[dog.ageCategory], now)
  return [dog.breed.trim(), age, shortOwner(dog.contact.name)].filter((part) => part !== '').join(' · ')
}

export function dogMeta(dog: Dog): string {
  return dogSubtitle(dog, new Date())
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('it-IT') + value.slice(1)
}

export function dogThirdLine(dog: Dog, appointments: Appointment[], now: Date, daysBefore: number): { text: string; tone: 'warn' | 'tx3' } {
  if (dog.status === 'non_in_cura' || dog.status === 'deceduto') return { text: ARCHIVE_LABEL[dog.status], tone: 'tx3' }
  const next = nextAppointment(appointments, dog.id, now)
  if (next) {
    const text = isSameDay(next.start, now) ? `Oggi ${format(next.start, 'HH:mm', IT_DATE)}` : capitalize(format(next.start, 'EEE d MMM HH:mm', IT_DATE))
    return { text, tone: 'tx3' }
  }
  const soon = dueSoon([dog], appointments, now, daysBefore).find((row) => row.dog.id === dog.id)
  if (!soon) return { text: 'Nessun appuntamento', tone: 'tx3' }
  if (!soon.lastCompleted) return { text: 'Da fissare', tone: 'warn' }
  return { text: `Da fissare · ultimo ${format(soon.lastCompleted.start, 'd MMM', IT_DATE)}`, tone: 'warn' }
}

function byName(a: Dog, b: Dog): number {
  return a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id)
}

export function sortDogs(dogs: Dog[], mode: DogSort, nextOf: (dog: Dog) => Date | null): Dog[] {
  const copy = [...dogs]
  if (mode === 'alfabetico') return copy.sort(byName)
  return copy.sort((a, b) => {
    const aNext = nextOf(a)
    const bNext = nextOf(b)
    if (aNext && bNext) return aNext.getTime() - bNext.getTime() || byName(a, b)
    if (aNext) return -1
    if (bNext) return 1
    return byName(a, b)
  })
}

function inTab(dog: Dog, tab: DogTab): boolean {
  if (tab === 'archivio') return dog.status === 'non_in_cura' || dog.status === 'deceduto'
  if (dog.status !== 'attivo') return false
  if (tab === 'mensili') return dog.clientType === 'mensile'
  if (tab === 'occasionali') return dog.clientType === 'occasionale'
  return true
}

function inChip(dog: Dog, chip: DogChip, appointments: Appointment[], now: Date): boolean {
  if (chip === 'mordaci') return dog.temperament === 'mordace'
  if (chip === 'anziani') return dog.ageCategory === 'anziano'
  if (chip === 'gatti') return dog.species === 'gatto'
  if (chip === 'in_agenda') return nextAppointment(appointments, dog.id, now) !== null
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

export function visibleDogs(dogs: Dog[], tab: DogTab, chip: DogChip, query: string, appointments: Appointment[] = [], now: Date = new Date()): Dog[] {
  const normalized = normalizeSearch(query)
  return dogs.filter((dog) => {
    if (!inTab(dog, tab)) return false
    if (!inChip(dog, chip, appointments, now)) return false
    if (!normalized) return true
    return dog.searchKey.includes(normalized)
  })
}
