import { haAccesso, puoProporre, type StatoPiano } from './piano'

export function exportBloccato(mostraPiani: boolean, stato: StatoPiano): boolean {
  if (!mostraPiani) return false
  return !haAccesso(stato, 'export')
}

export function mostraFasciaAumento(
  mostraPiani: boolean,
  ui: { ultimaProposta?: string },
  creatoIl: Date,
  adesso: Date,
  stato?: StatoPiano,
): boolean {
  if (!mostraPiani) return false
  if (stato && haAccesso(stato, 'aumentoListino')) return false
  if (adesso.getDate() < 1 || adesso.getDate() > 5) return false
  return puoProporre(ui, creatoIl, adesso)
}
