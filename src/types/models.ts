export type ServiceIconKey =
  | 'bagno'
  | 'taglio'
  | 'bagno_taglio'
  | 'nodi'
  | 'dermatologico'
  | 'antiparassitario'

export type ServiceKind = 'principale' | 'extra'

export interface SizeTriple {
  piccola: number
  media: number
  grande: number
}

export interface Service {
  id: string
  name: string
  iconKey?: ServiceIconKey
  kind: ServiceKind
  durationMin: SizeTriple
  price: SizeTriple
  order: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ServiceInput {
  name: string
  kind: ServiceKind
  durationMin: SizeTriple
  price: SizeTriple
  active: boolean
}

export interface ServicePatch {
  name?: string
  durationMin?: SizeTriple
  price?: SizeTriple
  active?: boolean
}

export const SERVICE_ICON_KEYS: ServiceIconKey[] = [
  'bagno', 'taglio', 'bagno_taglio', 'nodi', 'dermatologico', 'antiparassitario',
]

export type Species = 'cane' | 'gatto' | 'altro'
export type Sex = 'M' | 'F'
export type AgeCategory = 'cucciolo' | 'giovane' | 'adulto' | 'anziano'
export type DogSize = 'piccola' | 'media' | 'grande'
export type Temperament = 'bravo' | 'agitato' | 'mordace'
export type ClientType = 'mensile' | 'occasionale'
export type DogStatus = 'attivo' | 'non_in_cura' | 'deceduto'

export interface DogContact {
  name: string
  phone: string
}

export interface DogDraft {
  name: string
  species: Species
  breed: string
  sex?: Sex
  ageCategory: AgeCategory
  size: DogSize
  temperament: Temperament
  clientType: ClientType
  criticalNote?: string
  notes?: string
  contact: DogContact
}

export interface DogWrite extends DogDraft {
  photo?: string
}

export interface Dog extends DogWrite {
  id: string
  status: DogStatus
  archivedAt?: Date
  searchKey: string
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentService {
  serviceId: string
  name: string
  durationMin: number
  price: number
}

export interface Appointment {
  id: string
  dogId: string
  start: Date
  services: AppointmentService[]
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentWrite {
  dogId: string
  start: Date
  services: AppointmentService[]
}
