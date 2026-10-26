import { eFeature, haAccesso, statoPiano, type FeatureKey, type ProMain, type StatoPiano } from './piano'

export type LivelloElenco = 'base' | 'pro' | 'salone' | 'vip'
export type FunzioniMappa = Partial<Record<string, boolean>>
export type ChiaveStrumentoPiano = 'messaggi' | 'affidabilita' | 'noteVocali'

const STRUMENTI: readonly ChiaveStrumentoPiano[] = ['messaggi', 'affidabilita', 'noteVocali']

export function eVip(doc: ProMain | null | undefined): boolean {
  if (!doc) return false
  return doc.fonte === 'omaggio'
    && doc.piano === 'salone'
    && doc.stato === 'attivo'
    && (doc.scadeIl == null || doc.scadeIl === '')
}

export function livelloElenco(doc: ProMain | null | undefined, adesso = new Date()): LivelloElenco {
  if (eVip(doc)) return 'vip'
  return statoPiano(doc ?? undefined, adesso).livello
}

export function decisioneVip(
  doc: ProMain | null | undefined,
  azione: string,
): { ok: true } | { ok: false; message: string } {
  if (eVip(doc) && azione !== 'salone') return { ok: false, message: 'Il piano VIP resta attivo' }
  return { ok: true }
}

export function eChiaveFunzione(chiave: string): chiave is FeatureKey | ChiaveStrumentoPiano {
  return (STRUMENTI as readonly string[]).includes(chiave) || eFeature(chiave)
}

export function funzioneVisibile(
  stato: StatoPiano,
  funzioni: FunzioniMappa | null | undefined,
  feature: FeatureKey,
): boolean {
  if (funzioni?.[feature] === false) return false
  if (funzioni?.[feature] === true) return true
  return haAccesso(stato, feature)
}

export function strumentoVisibile(
  chiave: ChiaveStrumentoPiano,
  settings: { strumenti?: Partial<Record<ChiaveStrumentoPiano, boolean>> } | null | undefined,
  funzioni: FunzioniMappa | null | undefined,
): boolean {
  if (funzioni?.[chiave] === false) return false
  if (chiave === 'messaggi') return settings?.strumenti?.messaggi !== false
  if (funzioni?.[chiave] === true) return true
  return settings?.strumenti?.[chiave] === true
}

export function statoDaLivello(livello: LivelloElenco, adesso = new Date()): StatoPiano {
  if (livello === 'pro') return statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, adesso)
  if (livello === 'salone' || livello === 'vip') {
    return statoPiano({
      piano: 'salone',
      stato: 'attivo',
      fonte: livello === 'vip' ? 'omaggio' : 'manuale',
      scadeIl: null,
    }, adesso)
  }
  return statoPiano(undefined, adesso)
}

export function funzioneAccesa(
  livello: LivelloElenco,
  funzioni: FunzioniMappa | null | undefined,
  chiave: string,
  adesso = new Date(),
): boolean {
  if (!eChiaveFunzione(chiave)) return false
  if (funzioni?.[chiave] === false) return false
  if (funzioni?.[chiave] === true) return true
  if (chiave === 'messaggi') return true
  if (chiave === 'affidabilita' || chiave === 'noteVocali') return false
  return funzioneVisibile(statoDaLivello(livello, adesso), funzioni, chiave)
}
