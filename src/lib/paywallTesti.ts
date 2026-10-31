import {
  Bell, Cake, CalendarPlus, ClipboardCheck, Cloud, CloudUpload, FileDown, Heart, History, Images, Link, List,
  MessageCircle, PawPrint, PenOff, RotateCcw, Star, Tag, TrendingUp, UserPlus, Users, type LucideIcon,
} from 'lucide-react'
import type { Chiave } from '../i18n/t'
import type { FeatureKey } from './piano'

export const TESTI_PAYWALL: Record<FeatureKey, { titolo: Chiave; testo: Chiave; icona: LucideIcon }> = {
  export: { titolo: 'pwExportTitolo', testo: 'pwExportTesto', icona: FileDown },
  backupAuto: { titolo: 'pwBackupAutoTitolo', testo: 'pwBackupAutoTesto', icona: History },
  drive: { titolo: 'pwDriveTitolo', testo: 'pwDriveTesto', icona: Cloud },
  messaggiCategoria: { titolo: 'pwMessaggiCategoriaTitolo', testo: 'pwMessaggiCategoriaTesto', icona: MessageCircle },
  copieCloud: { titolo: 'pwCopieCloudTitolo', testo: 'pwCopieCloudTesto', icona: CloudUpload },
  promemoriaAuto: { titolo: 'pwPromemoriaAutoTitolo', testo: 'pwPromemoriaAutoTesto', icona: Bell },
  richiamo: { titolo: 'pwRichiamoTitolo', testo: 'pwRichiamoTesto', icona: RotateCcw },
  pronto: { titolo: 'pwProntoTitolo', testo: 'pwProntoTesto', icona: PawPrint },
  compleanno: { titolo: 'pwCompleannoTitolo', testo: 'pwCompleannoTesto', icona: Cake },
  pagella: { titolo: 'pwPagellaTitolo', testo: 'pwPagellaTesto', icona: ClipboardCheck },
  prezzoSuggerito: { titolo: 'pwPrezzoSuggeritoTitolo', testo: 'pwPrezzoSuggeritoTesto', icona: Tag },
  aumentoListino: { titolo: 'pwAumentoListinoTitolo', testo: 'pwAumentoListinoTesto', icona: TrendingUp },
  collage: { titolo: 'pwCollageTitolo', testo: 'pwCollageTesto', icona: Images },
  senzaFirma: { titolo: 'pwSenzaFirmaTitolo', testo: 'pwSenzaFirmaTesto', icona: PenOff },
  prenotazioni: { titolo: 'pwPrenotazioniTitolo', testo: 'pwPrenotazioniTesto', icona: CalendarPlus },
  listaAttesa: { titolo: 'pwListaAttesaTitolo', testo: 'pwListaAttesaTesto', icona: List },
  recensioni: { titolo: 'pwRecensioniTitolo', testo: 'pwRecensioniTesto', icona: Star },
  fedelta: { titolo: 'pwFedeltaTitolo', testo: 'pwFedeltaTesto', icona: Heart },
  schedaCliente: { titolo: 'pwSchedaClienteTitolo', testo: 'pwSchedaClienteTesto', icona: Link },
  team: { titolo: 'pwTeamTitolo', testo: 'pwTeamTesto', icona: Users },
  postiExtra: { titolo: 'pwPostiExtraTitolo', testo: 'pwPostiExtraTesto', icona: UserPlus },
}
