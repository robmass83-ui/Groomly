import { z } from 'zod'
import type { DogDraft, ServiceInput, SizeTriple } from '../types/models'
import { isStartTime } from './appointments'

const durationField = z.string().trim().regex(/^\d+$/, 'Minuti interi, minimo 1').transform(Number).refine((value) => value >= 1, 'Minuti interi, minimo 1')

const priceField = z.string().trim().transform((value, ctx) => {
  const normalized = value.replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prezzo ≥ 0, al massimo due decimali' })
    return z.NEVER
  }
  return Number(normalized)
})

const triple = z.object({ piccola: durationField, media: durationField, grande: durationField })
const priceTriple = z.object({ piccola: priceField, media: priceField, grande: priceField })

export const loginSchema = z.object({
  email: z.string().trim().email('Inserisci un’email valida'),
  password: z.string().min(8, 'Minimo 8 caratteri'),
})

function sameTriple(value: number): SizeTriple {
  return { piccola: value, media: value, grande: value }
}

export const serviceFormSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('principale'),
    name: z.string().trim().min(1, 'Il nome è obbligatorio'),
    active: z.boolean(),
    durationMin: triple,
    price: priceTriple,
  }),
  z.object({
    kind: z.literal('extra'),
    name: z.string().trim().min(1, 'Il nome è obbligatorio'),
    active: z.boolean(),
    durationMin: durationField,
    price: priceField,
  }),
]).transform((value): ServiceInput => {
  if (value.kind === 'extra') {
    return {
      kind: 'extra',
      name: value.name,
      active: value.active,
      durationMin: sameTriple(value.durationMin),
      price: sameTriple(value.price),
    }
  }
  return value
})

export const dogFormSchema = z.object({
  name: z.string().trim().min(1, 'Il nome è obbligatorio'),
  species: z.enum(['cane', 'gatto', 'altro']),
  breed: z.string().trim(),
  sex: z.enum(['', 'M', 'F']),
  ageCategory: z.enum(['cucciolo', 'giovane', 'adulto', 'anziano']),
  size: z.enum(['piccola', 'media', 'grande']),
  temperament: z.enum(['bravo', 'agitato', 'mordace']),
  clientType: z.enum(['mensile', 'occasionale']),
  contactName: z.string().trim(),
  phone: z.string().trim().min(1, 'Il telefono è obbligatorio'),
  notes: z.string().trim(),
  criticalNote: z.string().trim(),
}).transform((value): DogDraft => ({
  name: value.name,
  species: value.species,
  breed: value.breed,
  sex: value.sex === '' ? undefined : value.sex,
  ageCategory: value.ageCategory,
  size: value.size,
  temperament: value.temperament,
  clientType: value.clientType,
  notes: value.notes === '' ? undefined : value.notes,
  criticalNote: value.criticalNote === '' ? undefined : value.criticalNote,
  contact: { name: value.contactName, phone: value.phone },
}))

export interface AppointmentFormValues {
  dogId: string
  serviceIds: string[]
  day: string
  time: string
}

export const appointmentFormSchema = z.object({
  dogId: z.string().min(1, 'Scegli un cane'),
  serviceIds: z.array(z.string()).min(1, 'Scegli un servizio'),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scegli il giorno'),
  time: z.string().refine(isStartTime, 'Scegli l’ora'),
})
