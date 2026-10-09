import type { Dog, Service } from '../types/models'
import { normalizeSearch } from './dogList'

export function quotedPrice(dog: Dog, service: Service): { price: number; durationMin: number } {
  const override = dog.servicePrices.find((item) => item.serviceId === service.id)
  if (override) return { price: override.price, durationMin: override.durationMin }
  return { price: service.price[dog.size], durationMin: service.durationMin[dog.size] }
}

export function roundEnd(start: Date, durationMin: number): Date {
  const exact = new Date(start.getTime() + durationMin * 60_000)
  const minutes = exact.getHours() * 60 + exact.getMinutes() + exact.getSeconds() / 60 + exact.getMilliseconds() / 60_000
  const rounded = Math.round(minutes / 5) * 5
  const result = new Date(exact.getFullYear(), exact.getMonth(), exact.getDate(), 0, 0, 0, 0)
  result.setMinutes(rounded)
  return result
}

function searchTier(dog: Dog, needle: string): number | null {
  const name = normalizeSearch(dog.name)
  if (name.startsWith(needle)) return 0
  if (name.includes(needle)) return 1
  const owner = normalizeSearch(dog.contact.name)
  const breed = normalizeSearch(dog.breed)
  if (owner.includes(needle) || breed.includes(needle)) return 2
  return null
}

export function rankDogs(dogs: Dog[], query: string): Dog[] {
  const needle = normalizeSearch(query)
  return dogs
    .filter((dog) => dog.status === 'attivo')
    .flatMap((dog) => {
      const tier = searchTier(dog, needle)
      return tier === null ? [] : [{ dog, tier }]
    })
    .sort((a, b) => a.tier - b.tier || normalizeSearch(a.dog.name).localeCompare(normalizeSearch(b.dog.name)) || a.dog.id.localeCompare(b.dog.id))
    .slice(0, 6)
    .map((item) => item.dog)
}
