import type { Dog, Service } from '../types/models'
import type { PriceSheet } from '../types/priceSheet'
import { normalizeSearch, phoneDigits } from './dogList'
import { prezzoDalListino } from './listinoRazza'

export { roundEnd } from './fineServizi'

export function quotedPrice(
  dog: Dog,
  service: Service,
  listino?: { sheet?: PriceSheet; servizi: Service[] },
): { price: number; durationMin: number; daListino?: string } {
  const override = dog.servicePrices.find((item) => item.serviceId === service.id)
  if (override) {
    return {
      price: override.price ?? service.price[dog.size],
      durationMin: override.durationMin ?? service.durationMin[dog.size],
    }
  }
  const dalFoglio = listino ? prezzoDalListino(dog, service, listino.sheet, listino.servizi) : null
  if (dalFoglio) return { price: dalFoglio.prezzo, durationMin: service.durationMin[dog.size], daListino: dalFoglio.razza }
  return { price: service.price[dog.size], durationMin: service.durationMin[dog.size] }
}

function searchTier(dog: Dog, query: string, needle: string): number | null {
  const name = normalizeSearch(dog.name)
  if (name.startsWith(needle)) return 0
  if (name.includes(needle)) return 1
  const owner = normalizeSearch(dog.contact.name)
  const breed = normalizeSearch(dog.breed)
  if (owner.includes(needle) || breed.includes(needle)) return 2
  const digits = phoneDigits(query)
  if (digits.length >= 3) {
    const phones = [dog.contact.phone, ...dog.contacts.map((contact) => contact.phone)]
    if (phones.some((phone) => phoneDigits(phone).includes(digits))) return 3
  }
  return null
}

export function rankDogs(dogs: Dog[], query: string): Dog[] {
  const needle = normalizeSearch(query)
  return dogs
    .filter((dog) => dog.status === 'attivo')
    .flatMap((dog) => {
      const tier = searchTier(dog, query, needle)
      return tier === null ? [] : [{ dog, tier }]
    })
    .sort((a, b) => a.tier - b.tier || normalizeSearch(a.dog.name).localeCompare(normalizeSearch(b.dog.name)) || a.dog.id.localeCompare(b.dog.id))
    .slice(0, 6)
    .map((item) => item.dog)
}
