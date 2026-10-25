import { format, isSameDay } from 'date-fns'
import { enGB, es, it } from 'date-fns/locale'
import type { Lingua } from '../i18n/lingua'
import { t, type Chiave } from '../i18n/t'
import type { AgeCategory, Appointment, ClientType, Dog, DogSize, DogStatus, Sex, Species, Temperament } from '../types/models'
import { nextAppointment, startOfLocalDay } from './appointments'
import { dueSoon } from './cycle'
import { ageText, shortOwner } from './display'
import { IT_DATE } from './format'

export type DogTab = 'attivi' | 'mensili' | 'occasionali' | 'archivio'
export type DogChip = 'tutti' | 'mordaci' | 'anziani' | 'in_agenda' | 'gatti' | 'altri'
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

export function buildSearchKey(name: string, breed: string, ...contactNames: string[]): string {
  return normalizeSearch([name, breed, ...contactNames].join(' '))
}

export function phoneDigits(value: string): string {
  let text = value.trim()
  if (text.startsWith('+39')) text = text.slice(3)
  else if (text.startsWith('0039')) text = text.slice(4)
  return text.trimStart().replace(/\D/g, '')
}

export function storedSearchKey(name: string, breed: string, contactNames: string[], phones: string[]): string {
  const digits: string[] = []
  for (const phone of phones) {
    const next = phoneDigits(phone)
    if (next.length >= 3 && !digits.includes(next)) digits.push(next)
  }
  return [buildSearchKey(name, breed, ...contactNames), ...digits].filter((part) => part !== '').join(' ')
}

export function matchesDog(dog: Dog, query: string): boolean {
  const needle = normalizeSearch(query)
  const names = [dog.name, dog.breed, dog.contact.name, ...dog.contacts.map((contact) => contact.name)]
  if (needle !== '' && normalizeSearch(names.join(' ')).includes(needle)) return true
  const digits = phoneDigits(query)
  if (digits.length < 3) return false
  const phones = [dog.contact.phone, ...dog.contacts.map((contact) => contact.phone)]
  return phones.some((phone) => phoneDigits(phone).includes(digits))
}

export function breedSurname(dog: Dog): string {
  const surname = dog.contact.name.trim().split(/\s+/).filter((part) => part !== '').at(-1) ?? ''
  return [dog.breed.trim(), surname].filter((part) => part !== '').join(' · ')
}

export function dogMark(dog: Dog, peers: Dog[]): string | null {
  const key = normalizeSearch(dog.name)
  const homonyms = peers.filter((peer) => peer.id !== dog.id && normalizeSearch(peer.name) === key)
  if (homonyms.length === 0) return null
  const line = breedSurname(dog)
  const duplicated = line !== '' && homonyms.some((peer) => breedSurname(peer) === line)
  if (line === '' || duplicated) {
    const short = shortOwner(dog.contact.name)
    return short === '' ? null : short
  }
  return line
}

function birthYearOf(dog: Dog): number | undefined {
  const value = (dog as { birthYear?: unknown }).birthYear
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

const LOCALI = { it, en: enGB, es }
const ETA: Record<AgeCategory, Chiave> = {
  cucciolo: 'etaCucciolo',
  giovane: 'etaGiovane',
  adulto: 'etaAdulto',
  anziano: 'etaAnziano',
}

export function dogSubtitle(dog: Dog, now: Date, lingua: Lingua = 'it'): string {
  const age = ageText(birthYearOf(dog), t(lingua, ETA[dog.ageCategory]), now, lingua)
  return [dog.breed.trim(), age, shortOwner(dog.contact.name)].filter((part) => part !== '').join(' · ')
}

export const SPECIE_CANE: Species = 'cane'
export const SPECIE_GATTO: Species = 'gatto'
export const SPECIE_ALTRO: Species = 'altro'
export const TAGLIE = ['piccola', 'media', 'grande'] as const satisfies readonly DogSize[]

export function isOtherSpecies(dog: { species: Species }): boolean {
  return dog.species === SPECIE_ALTRO
}

export function dogMeta(dog: Dog): string {
  return dogSubtitle(dog, new Date())
}

function capitalize(value: string, lingua: Lingua): string {
  const intl = lingua === 'en' ? 'en-GB' : lingua === 'es' ? 'es-ES' : 'it-IT'
  return value.charAt(0).toLocaleUpperCase(intl) + value.slice(1)
}

export function dogThirdLine(dog: Dog, appointments: Appointment[], now: Date, daysBefore: number, lingua: Lingua = 'it'): { text: string; tone: 'warn' | 'tx3' } {
  if (dog.status === 'non_in_cura' || dog.status === 'deceduto') {
    return { text: t(lingua, dog.status === 'deceduto' ? 'caniDeceduto' : 'caniNonInCura'), tone: 'tx3' }
  }
  const today = startOfLocalDay(now).getTime()
  const scheduled = appointments
    .filter((item) => item.dogId === dog.id && item.status === 'programmato')
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
  const next = scheduled.find((item) => startOfLocalDay(item.start).getTime() >= today)
  const data = lingua === 'it' ? IT_DATE : { locale: LOCALI[lingua], weekStartsOn: 1 as const }
  if (next) {
    const text = isSameDay(next.start, now)
      ? t(lingua, 'caniOggiOra', { ora: format(next.start, 'HH:mm', data) })
      : capitalize(format(next.start, 'EEE d MMM HH:mm', data), lingua)
    return { text, tone: 'tx3' }
  }
  if (scheduled.length > 0) return { text: t(lingua, 'homeDaChiudere'), tone: 'warn' }
  const soon = dueSoon([dog], appointments, now, daysBefore).find((row) => row.dog.id === dog.id)
  if (!soon) return { text: t(lingua, 'homeNessunAppuntamento'), tone: 'tx3' }
  if (!soon.lastCompleted) return { text: t(lingua, 'caniDaFissare'), tone: 'warn' }
  return { text: t(lingua, 'caniDaFissareUltimo', { data: format(soon.lastCompleted.start, 'd MMM', data) }), tone: 'warn' }
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
  if (chip === 'altri') return dog.species === 'altro'
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
    return matchesDog(dog, query)
  })
}
