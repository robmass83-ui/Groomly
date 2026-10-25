import type { AgeCategory, ClientType, DogSize, Sex, Species, Temperament } from '../types/models'

export interface AgeThresholds {
  giovaneFrom: number
  adultoFrom: number
  anzianoFrom: number
}

export interface DogScreen {
  species: Species
  breed: string
  sex?: Sex
  ageCategory: AgeCategory
  size: DogSize
  temperament: Temperament
  clientType: ClientType
  name: string
  owner: string
  phone: string
  email?: string
  notes: string
  criticalNote: string
  birthYear: string
  weight: string
  recurrenceWeeks: number
}

export function categoryFromYear(year: number, now: Date, thresholds: AgeThresholds): AgeCategory {
  const years = now.getFullYear() - year
  if (years < thresholds.giovaneFrom) return 'cucciolo'
  if (years < thresholds.adultoFrom) return 'giovane'
  if (years < thresholds.anzianoFrom) return 'adulto'
  return 'anziano'
}

export function seniorOf(category: AgeCategory): boolean {
  return category === 'anziano'
}

export function completeYear(year: string, now: Date): number | null {
  if (!/^\d{4}$/.test(year)) return null
  const value = Number(year)
  if (value < 1990 || value > now.getFullYear()) return null
  return value
}

export function applyBirthYear(
  screen: { ageCategory: AgeCategory; birthYear: string },
  year: string,
  now: Date,
  thresholds: AgeThresholds,
): { ageCategory: AgeCategory; birthYear: string } {
  const parsed = completeYear(year, now)
  if (parsed === null || year === screen.birthYear) {
    return { ageCategory: screen.ageCategory, birthYear: year }
  }
  return { ageCategory: categoryFromYear(parsed, now, thresholds), birthYear: year }
}
