import { AppError } from '../errors'
import { salonCollection } from '../../lib/salonPath'

let salonId: string | null = null

export function bindSalon(next: string): void {
  salonId = next
}

export function clearSalon(): void {
  salonId = null
}

export function currentSalonId(): string | null {
  return salonId
}

export function salonDocPath(kind: string, id: string): string[] {
  if (!salonId) throw new AppError('Salvataggio non riuscito', 'storage_write')
  return [...salonCollection(salonId), kind, id]
}

export function salonRootPath(): string[] {
  if (!salonId) throw new AppError('Salvataggio non riuscito', 'storage_write')
  return salonCollection(salonId)
}
