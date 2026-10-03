import { z } from 'zod'
import type { ServiceInput, SizeTriple } from '../types/models'

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
