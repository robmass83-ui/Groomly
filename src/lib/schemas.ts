import { z } from 'zod'
import { PRICE_ICONS, type PriceIconKey } from '../assets/icons/icons'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import type { DogDraft, ServiceInput, SizeTriple } from '../types/models'
import { isStartTime } from './appointments'
import { vatError } from './profile'

const priceIconKeys = Object.keys(PRICE_ICONS) as [PriceIconKey, ...PriceIconKey[]]
const priceKindSchema = z.enum(['da', 'fisso', 'valutazione'])
const priceItemSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  iconKey: z.enum(priceIconKeys),
  tipo: priceKindSchema,
  prezzo: z.number().nonnegative().optional(),
})
const priceItemWithoutIconSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  tipo: priceKindSchema,
  prezzo: z.number().nonnegative().optional(),
})

export const priceSheetSchema = z.object({
  version: z.literal(1),
  intestazione: z.object({
    logo: z.string().optional(),
    logoForma: z.enum(['tondo', 'quadrato']).optional(),
    titolo: z.string(),
    sottotitolo: z.string(),
    nome: z.string(),
    descrizione: z.string(),
    indirizzo: z.string(),
    telefono: z.string(),
    colore: z.string(),
  }),
  razze: z.array(z.object({
    id: z.string().min(1),
    taglia: z.enum(['piccola', 'media', 'grande']),
    nome: z.string().min(1),
    voci: z.array(priceItemSchema).min(1),
  })).min(1),
  noteTaglia: z.object({
    piccola: z.string(),
    media: z.string(),
    grande: z.string(),
  }),
  bagnoTosatura: z.object({
    titolo: z.string(),
    sottotitolo: z.string(),
    voci: z.array(priceItemWithoutIconSchema),
  }),
  extra: z.object({
    titolo: z.string(),
    voci: z.array(priceItemSchema.extend({
      sotto: z.array(priceItemWithoutIconSchema),
    })),
  }),
  compresi: z.object({
    titolo: z.string(),
    voci: z.array(z.object({
      id: z.string().min(1),
      iconKey: z.enum(priceIconKeys),
      testo: z.string(),
    })),
  }),
  info: z.object({
    titolo: z.string(),
    intro: z.string(),
    punti: z.array(z.string()),
    chiusura: z.string(),
  }),
  avviso: z.object({
    titolo: z.string(),
    intro: z.string(),
    punti: z.array(z.string()),
  }),
  saluto: z.string(),
  sezioni: z.array(z.object({
    id: z.enum(['piccola', 'media', 'grande', 'bagnoTosatura', 'extra', 'info', 'avviso', 'compresi', 'saluto']),
    visibile: z.boolean(),
  })),
  opzioni: z.object({
    scriviAPartireDa: z.boolean(),
    formato: z.enum(['A4', 'A3']),
    tipoFile: z.enum(['pdf', 'jpeg']),
    lingua: z.enum(['it', 'en', 'es']).optional(),
  }),
  updatedAt: z.string(),
})

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

export function loginSchemaPer(lingua: Lingua = 'it') {
  return z.object({
    email: z.string().trim().email(t(lingua, 'authEmailValida')),
    password: z.string().min(8, t(lingua, 'authMinimo')),
  })
}

export const loginSchema = loginSchemaPer()

function vatField(lingua: Lingua) {
  return z.string().trim().superRefine((value, ctx) => {
    if (vatError(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(lingua, 'authIvaForma') })
  })
}

export function registrationSchemaPer(lingua: Lingua = 'it') {
  return z.object({
    firstName: z.string().trim().min(1, t(lingua, 'authNomeObb')),
    lastName: z.string().trim().min(1, t(lingua, 'authCognomeObb')),
    email: z.string().trim().email(t(lingua, 'authEmailValida')).transform((value) => value.toLowerCase()),
    password: z.string().min(8, t(lingua, 'authMinimo')),
    salonName: z.string().trim().min(1, t(lingua, 'authToelettaturaObb')),
    vatNumber: vatField(lingua).transform((value) => value.replace(/\s/g, '')),
    // Non è più nel modulo: arriva vuoto dai valori di default e si chiede più tardi, con Google.
    address: z.string().trim(),
    accettaTermini: z.boolean().refine((value) => value, { message: t(lingua, 'authAccetta') }),
  })
}

export const registrationSchema = registrationSchemaPer()

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

export const dogServiceQuoteSchema = z.object({
  price: priceField,
  durationMin: durationField,
})

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
