import { haAccesso, type StatoPiano } from './piano'

export function exportBloccato(stato: StatoPiano): boolean {
  return !haAccesso(stato, 'export')
}
