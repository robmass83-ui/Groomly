import { provaConcessa, statoPiano, type ProMain } from '../../../src/lib/piano'

export type LivelloPiano = 'base' | 'pro' | 'salone'
export type StatoPiano = 'attivo' | 'prova' | 'grazia' | 'sospeso' | 'disdetto' | 'scaduto'
export type FontePiano = 'play' | 'prova' | 'omaggio' | 'manuale' | null
export type AzionePiano = 'prova' | 'pro' | 'salone' | 'base'

export type CampiPiano = {
  piano: LivelloPiano
  stato: StatoPiano
  fonte: FontePiano
  scadeIl: string | null
  seatsIncluded?: number
  seatsExtra?: number
  provaUsata?: boolean
  rinnovoAutomatico?: boolean
}

export type DocumentoPiano = CampiPiano & {
  enabled: boolean
  seats: number
  seatsIncluded: number
  seatsExtra: number
}

const POSTI_SALONE = 3
const POSTI_MAX = 8
const GIORNO_MS = 24 * 60 * 60 * 1000

export function scriviPiano(campi: CampiPiano, adesso: Date): DocumentoPiano {
  const extra = Math.max(0, Math.floor(campi.seatsExtra ?? 0))
  const included = campi.piano === 'salone' ? Math.max(0, Math.floor(campi.seatsIncluded ?? POSTI_SALONE)) : 0
  const seats = campi.piano === 'salone' ? Math.min(POSTI_MAX, included + extra) : 0
  const scade = campi.scadeIl ? new Date(campi.scadeIl) : null
  const scadeValida = scade !== null && !Number.isNaN(scade.getTime())
  const senzaScadenza = !scadeValida && (campi.fonte === 'omaggio' || campi.fonte === 'manuale')
  const nelFuturo = scadeValida && (scade as Date).getTime() > adesso.getTime()
  const vivo = campi.stato === 'attivo'
    || campi.stato === 'prova'
    || campi.stato === 'grazia'
    || (campi.stato === 'disdetto' && (senzaScadenza || nelFuturo))
  const enabled = campi.piano === 'salone' && vivo
  const haAvutoPlus = campi.piano === 'pro' || campi.piano === 'salone'
  return {
    ...campi,
    ...(haAvutoPlus ? { provaUsata: true } : {}),
    seatsIncluded: included,
    seatsExtra: extra,
    seats,
    enabled,
  }
}

export function campiBypass(decisione: {
  piano: LivelloPiano
  stato: StatoPiano
  fonte: FontePiano
  scadeIl: string | null
}): CampiPiano {
  return {
    piano: decisione.piano,
    stato: decisione.stato,
    fonte: decisione.fonte,
    scadeIl: decisione.scadeIl,
    seatsIncluded: decisione.piano === 'salone' ? 3 : 0,
    seatsExtra: 0,
    rinnovoAutomatico: false,
  }
}

export function campiOmaggio(livello: 'pro' | 'salone'): CampiPiano {
  return {
    piano: livello,
    stato: 'attivo',
    fonte: 'omaggio',
    scadeIl: null,
    seatsIncluded: livello === 'salone' ? POSTI_SALONE : 0,
    seatsExtra: 0,
    rinnovoAutomatico: false,
  }
}

export function campiProva(adesso: Date, giorni = 30): CampiPiano {
  return {
    piano: 'pro',
    stato: 'prova',
    fonte: 'prova',
    scadeIl: new Date(adesso.getTime() + giorni * GIORNO_MS).toISOString(),
    seatsIncluded: 0,
    seatsExtra: 0,
    provaUsata: true,
    rinnovoAutomatico: false,
  }
}

export function campiBase(provaUsata: boolean): CampiPiano {
  return {
    piano: 'base',
    stato: 'scaduto',
    fonte: null,
    scadeIl: null,
    seatsIncluded: 0,
    seatsExtra: 0,
    provaUsata,
    rinnovoAutomatico: false,
  }
}

export function decisioneProva(
  ruolo: string,
  documento: ProMain | undefined,
  adesso: Date,
): { ok: true } | { ok: false; message: string } {
  if (ruolo !== 'titolare') return { ok: false, message: 'Accesso negato' }
  if (!provaConcessa(documento, adesso)) return { ok: false, message: 'Prova non disponibile' }
  return { ok: true }
}

export function decisioneManuale(
  operator: boolean,
  salonId: string,
): { ok: true } | { ok: false; message: string } {
  if (!operator || salonId === '' || salonId.includes('/') || salonId === 'shared') {
    return { ok: false, message: 'Accesso negato' }
  }
  return { ok: true }
}

// Chi aveva gia' una traccia di Plus (doc scritto prima della regola A2) la conserva quando l'operatore spegne o azzera.
export function tracciaProva(attuale: ProMain | undefined, provaUsata: boolean, adesso: Date): boolean {
  return provaUsata || !provaConcessa(attuale && { ...attuale, provaUsata }, adesso)
}

export function conTraccia(campi: CampiPiano, traccia: boolean): CampiPiano {
  return traccia ? { ...campi, provaUsata: true } : campi
}

export function campiAzione(azione: AzionePiano, adesso: Date, traccia: boolean): CampiPiano {
  if (azione === 'prova') return campiProva(adesso)
  if (azione === 'pro') return campiOmaggio('pro')
  if (azione === 'salone') return campiOmaggio('salone')
  return campiBase(traccia)
}

// Stessa regola dell'app (statoPiano): un piano con data passata e' scaduto, quelli senza data non scadono.
export function pianoScaduto(attuale: CampiPiano, adesso: Date): DocumentoPiano | null {
  const vivo = attuale.stato === 'attivo' || attuale.stato === 'prova' || attuale.stato === 'grazia' || attuale.stato === 'disdetto'
  if (!vivo || !attuale.scadeIl) return null
  if (statoPiano(attuale, adesso).stato !== 'scaduto') return null
  return scriviPiano(campiBase(true), adesso)
}
