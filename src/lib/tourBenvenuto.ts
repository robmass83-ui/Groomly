import type { PassoSalone } from './completaSalone'

export type ConfigTour = { acceso: boolean; dal: string | null }
export type TourSalone = { stato: 'in-corso' | 'visto'; saltati: PassoSalone[] }

const PASSI_NOTI: readonly PassoSalone[] = ['logo', 'sede', 'listino', 'backup', 'email', 'fiscale']
const STATI_NOTI = ['in-corso', 'visto'] as const

const èPasso = (valore: unknown): valore is PassoSalone =>
  typeof valore === 'string' && (PASSI_NOTI as readonly string[]).includes(valore)

const èOggetto = (valore: unknown): valore is Record<string, unknown> =>
  typeof valore === 'object' && valore !== null && !Array.isArray(valore)

export function leggiConfigTour(config: Record<string, unknown> | null): ConfigTour {
  const grezzo = config?.tourBenvenuto
  if (!èOggetto(grezzo)) return { acceso: false, dal: null }
  const acceso = grezzo.acceso === true
  const dal = typeof grezzo.dal === 'string' ? grezzo.dal : null
  return { acceso, dal }
}

export function leggiTourSalone(raw: unknown): TourSalone | undefined {
  if (!èOggetto(raw)) return undefined
  const stato = STATI_NOTI.find((noto) => noto === raw.stato)
  if (!stato) return undefined
  const saltati = Array.isArray(raw.saltati)
    ? [...new Set(raw.saltati.filter(èPasso))]
    : []
  return { stato, saltati }
}

export function deveVedereTour(input: {
  config: ConfigTour
  creazioneAccount: string | null
  collaboratore: boolean
  operatore: boolean
  tour: TourSalone | undefined
}): 'tour' | 'avviso' | 'niente' {
  const { config, creazioneAccount, collaboratore, operatore, tour } = input
  if (!config.acceso || collaboratore || operatore) return 'niente'
  // Date non leggibili (o account creato prima dell'accensione): niente tour.
  const dal = config.dal === null ? NaN : Date.parse(config.dal)
  const creato = creazioneAccount === null ? NaN : Date.parse(creazioneAccount)
  if (Number.isNaN(dal) || Number.isNaN(creato) || creato < dal) return 'niente'
  if (!tour) return 'tour'
  return tour.stato === 'in-corso' ? 'avviso' : 'niente'
}

export function passiDelTour(
  passi: readonly { id: PassoSalone; fatto: boolean }[],
  saltati: readonly PassoSalone[],
): PassoSalone[] {
  return passi
    .filter(({ id, fatto }) => {
      if (saltati.includes(id)) return false
      // Il listino resta sempre, anche se già fatto.
      return id === 'listino' || !fatto
    })
    .map(({ id }) => id)
}
