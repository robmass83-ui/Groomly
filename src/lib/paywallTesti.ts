import type { Chiave } from '../i18n/t'
import type { FeatureKey } from './piano'

export const TESTI_PAYWALL: Record<FeatureKey, { titolo: Chiave; testo: Chiave }> = {
  export: { titolo: 'pwExportTitolo', testo: 'pwExportTesto' },
  backupAuto: { titolo: 'pwBackupAutoTitolo', testo: 'pwBackupAutoTesto' },
  drive: { titolo: 'pwDriveTitolo', testo: 'pwDriveTesto' },
  messaggiCategoria: { titolo: 'pwMessaggiCategoriaTitolo', testo: 'pwMessaggiCategoriaTesto' },
  copieCloud: { titolo: 'pwCopieCloudTitolo', testo: 'pwCopieCloudTesto' },
  promemoriaAuto: { titolo: 'pwPromemoriaAutoTitolo', testo: 'pwPromemoriaAutoTesto' },
  richiamo: { titolo: 'pwRichiamoTitolo', testo: 'pwRichiamoTesto' },
  pronto: { titolo: 'pwProntoTitolo', testo: 'pwProntoTesto' },
  compleanno: { titolo: 'pwCompleannoTitolo', testo: 'pwCompleannoTesto' },
  pagella: { titolo: 'pwPagellaTitolo', testo: 'pwPagellaTesto' },
  prezzoSuggerito: { titolo: 'pwPrezzoSuggeritoTitolo', testo: 'pwPrezzoSuggeritoTesto' },
  aumentoListino: { titolo: 'pwAumentoListinoTitolo', testo: 'pwAumentoListinoTesto' },
  collage: { titolo: 'pwCollageTitolo', testo: 'pwCollageTesto' },
  senzaFirma: { titolo: 'pwSenzaFirmaTitolo', testo: 'pwSenzaFirmaTesto' },
  prenotazioni: { titolo: 'pwPrenotazioniTitolo', testo: 'pwPrenotazioniTesto' },
  listaAttesa: { titolo: 'pwListaAttesaTitolo', testo: 'pwListaAttesaTesto' },
  recensioni: { titolo: 'pwRecensioniTitolo', testo: 'pwRecensioniTesto' },
  fedelta: { titolo: 'pwFedeltaTitolo', testo: 'pwFedeltaTesto' },
  schedaCliente: { titolo: 'pwSchedaClienteTitolo', testo: 'pwSchedaClienteTesto' },
  team: { titolo: 'pwTeamTitolo', testo: 'pwTeamTesto' },
  postiExtra: { titolo: 'pwPostiExtraTitolo', testo: 'pwPostiExtraTesto' },
}
