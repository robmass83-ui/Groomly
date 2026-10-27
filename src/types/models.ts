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
  id: string
  name: string
  role: string
  phone: string
  isPrimary: boolean
}

export interface DogServicePrice {
  serviceId: string
  price?: number
  durationMin?: number
}

export interface CustomField {
  id: string
  label: string
  value: string
}

export interface GalleryPhoto {
  id: string
  photo: string
  takenAt: Date
}

export interface DogExtraNote {
  id: string
  text: string
  createdAt: Date
}

export interface NotaVocaleCane {
  id: string
  dataUrl: string
  createdAt: string
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
  extraNotes?: DogExtraNote[]
  noteVocali?: NotaVocaleCane[]
  contact: { name: string; phone: string; email?: string }
}

export interface DogWrite extends DogDraft {
  photo?: string
  birthYear?: number
  birthMonth?: number
  birthDay?: number
  isSenior?: boolean
  weightKg?: number
  tags?: string[]
  servicePrices?: DogServicePrice[]
  hiddenServiceIds?: string[]
  customFields?: CustomField[]
  gallery?: GalleryPhoto[]
  recurrenceWeeks?: number
  contacts?: DogContact[]
  removedPhotoIds?: string[]
  daRevisionare?: boolean
  emailBloccata?: boolean
}

export interface Dog extends DogWrite {
  id: string
  sourceDocId?: string
  status: DogStatus
  archivedAt?: Date
  searchKey: string
  createdAt: Date
  updatedAt: Date
  tags: string[]
  servicePrices: DogServicePrice[]
  hiddenServiceIds: string[]
  customFields: CustomField[]
  gallery: GalleryPhoto[]
  contacts: DogContact[]
}

export interface AppointmentService {
  serviceId: string
  name: string
  durationMin: number
  price: number
}

export type AppointmentStatus = 'programmato' | 'completato' | 'disdetto' | 'non_venuto'

export type CancelReason = 'cliente' | 'salone' | 'deceduto'

export interface AppointmentPhoto {
  id: string
  photo: string
  kind: 'prima' | 'dopo' | 'altro'
}

export type CycleAnchor = 'visita' | 'ritmo'

export type PaymentMethod = 'pos' | 'contanti' | 'na'

export interface Appointment {
  id: string
  dogId: string
  start: Date
  services: AppointmentService[]
  status: AppointmentStatus
  cancelReason?: CancelReason
  createdAt: Date
  updatedAt: Date
  end?: Date
  chiusoIl?: Date
  total?: number
  actualDurationMin?: number
  adjustmentNote?: string
  paymentMethod?: PaymentMethod
  tools?: string[]
  products?: string[]
  cutStyle?: string
  photos?: AppointmentPhoto[]
  removedPhotoIds?: string[]
  seriesId?: string
  cycleAnchor?: CycleAnchor
  coveredDue?: Date
  kind?: 'pelosetto' | 'personale'
  title?: string
  plannedEnd?: Date
  extraNotes?: DogExtraNote[]
  assigneeUid?: string
  provvisorio?: boolean
  scadeIl?: string
  richiestaId?: string
  ospiteNome?: string
}

export interface AppointmentWrite {
  dogId: string
  start: Date
  services: AppointmentService[]
  total?: number | null
  seriesId?: string
  cycleAnchor?: CycleAnchor
  coveredDue?: Date
  kind?: 'pelosetto' | 'personale'
  title?: string
  plannedEnd?: Date
  extraNotes?: DogExtraNote[]
  assigneeUid?: string
  provvisorio?: boolean
  scadeIl?: string
  richiestaId?: string
  ospiteNome?: string
}
