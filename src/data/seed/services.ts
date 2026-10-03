import type { ServiceInput, ServiceIconKey } from '../../types/models'

export interface SeedService extends ServiceInput {
  id: string
  order: number
  iconKey?: ServiceIconKey
}

export const SERVICE_SEED: SeedService[] = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
  { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 30, media: 35, grande: 45 } },
  { id: 'bagno-taglio', order: 2, name: 'Bagno + taglio', kind: 'principale', iconKey: 'bagno_taglio', active: true, durationMin: { piccola: 60, media: 90, grande: 120 }, price: { piccola: 35, media: 45, grande: 60 } },
  { id: 'stripping', order: 3, name: 'Stripping', kind: 'principale', active: true, durationMin: { piccola: 120, media: 150, grande: 180 }, price: { piccola: 50, media: 65, grande: 85 } },
  { id: 'nodi', order: 4, name: 'Gestione nodi', kind: 'extra', iconKey: 'nodi', active: true, durationMin: { piccola: 20, media: 20, grande: 20 }, price: { piccola: 5, media: 5, grande: 5 } },
  { id: 'dermatologico', order: 5, name: 'Dermatologico', kind: 'extra', iconKey: 'dermatologico', active: true, durationMin: { piccola: 15, media: 15, grande: 15 }, price: { piccola: 10, media: 10, grande: 10 } },
  { id: 'antiparassitario', order: 6, name: 'Antiparassitario', kind: 'extra', iconKey: 'antiparassitario', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 12, media: 12, grande: 12 } },
  { id: 'unghie', order: 7, name: 'Unghie', kind: 'extra', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 } },
]
