import { haAccesso, puoProporre, type StatoPiano } from './piano'
import type { ReportPreset } from './earnings'

export function periodoBloccato(mostraPiani: boolean, stato: StatoPiano, preset: ReportPreset): boolean {
  if (!mostraPiani || haAccesso(stato, 'reportPassati')) return false
  return preset === 'mese_scorso' || preset === 'tre_mesi' || preset === 'anno'
}

export function mesePrima(mostraPiani: boolean, stato: StatoPiano, mese: Date, adesso: Date): boolean {
  if (!mostraPiani || haAccesso(stato, 'reportPassati')) return false
  const inizio = new Date(adesso.getFullYear(), adesso.getMonth(), 1)
  return new Date(mese.getFullYear(), mese.getMonth(), 1).getTime() < inizio.getTime()
}

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
