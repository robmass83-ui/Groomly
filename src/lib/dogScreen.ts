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
  birthMonth: string
  birthDay: string
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

export function completeBirthday(
  month: string,
  day: string,
  year: number | null,
): { birthMonth: number; birthDay: number } | 'vuoto' | 'invalido' {
  const mese = month.trim()
  const giorno = day.trim()
  if (mese === '' && giorno === '') return 'vuoto'
  if (!/^\d{1,2}$/.test(mese) || !/^\d{1,2}$/.test(giorno)) return 'invalido'
  const birthMonth = Number(mese)
  const birthDay = Number(giorno)
  const anno = year ?? 2024
  const data = new Date(anno, birthMonth - 1, birthDay)
  if (birthMonth < 1 || birthMonth > 12 || data.getFullYear() !== anno || data.getMonth() !== birthMonth - 1 || data.getDate() !== birthDay) return 'invalido'
  return { birthMonth, birthDay }
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
