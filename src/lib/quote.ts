import type { Dog, Service } from '../types/models'

export function quotedPrice(dog: Dog, service: Service): { price: number; durationMin: number } {
  const override = dog.servicePrices.find((item) => item.serviceId === service.id)
  if (override) return { price: override.price, durationMin: override.durationMin }
  return { price: service.price[dog.size], durationMin: service.durationMin[dog.size] }
}
