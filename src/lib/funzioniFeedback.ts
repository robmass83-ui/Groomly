import type { Chiave } from '../i18n/t'
import type { FeatureKey } from './piano'

// Le funzioni del modulo feedback: l'elenco della Vetrina, ognuna con la sua FeatureKey.
const PLUS: { feature: FeatureKey; chiave: Chiave }[] = [
  { feature: 'prenotazioni', chiave: 'abbFPrenotazioni' },
  { feature: 'listaAttesa', chiave: 'abbFAttesa' },
  { feature: 'promemoriaAuto', chiave: 'abbFPromemoria' },
  { feature: 'messaggiCategoria', chiave: 'abbFMessaggi' },
  { feature: 'pronto', chiave: 'abbFPronto' },
  { feature: 'fedelta', chiave: 'abbFFedelta' },
  { feature: 'recensioni', chiave: 'abbFRecensioni' },
  { feature: 'export', chiave: 'abbFExport' },
  { feature: 'backupAuto', chiave: 'abbFBackup' },
]

export const FUNZIONI_FEEDBACK: Record<'pro' | 'salone', { feature: FeatureKey; chiave: Chiave }[]> = {
  pro: PLUS,
  salone: [...PLUS, { feature: 'team', chiave: 'abbFTeam' }, { feature: 'postiExtra', chiave: 'abbFPosti' }],
}
