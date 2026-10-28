import type { CampiPiano } from '../../functions/src/piano/scriviPiano'
import type { ProMain } from './piano'

export type AzioneBypass = 'scegli-pro' | 'scegli-salone' | 'spegni' | 'spegni-omaggio'

export type DecisioneBypass =
  | { ok: true; campi: CampiPiano; avviso: string | null }
  | { ok: false; manca: 'testo' | 'vip' | 'scelta' }

export function decisioneBypass(
  doc: ProMain | undefined,
  azione: AzioneBypass,
  testo: string,
  adesso: Date = new Date(),
): DecisioneBypass {
  if (azione === 'scegli-pro') return acceso('pro')
  if (azione === 'scegli-salone') return acceso('salone')
  if (azione === 'spegni-omaggio') return spento(null)
  if (azione === 'spegni') return spegni(doc, testo, adesso)
  return { ok: false, manca: 'scelta' }
}

function acceso(piano: 'pro' | 'salone'): DecisioneBypass {
  return {
    ok: true,
    avviso: null,
    campi: {
      piano,
      stato: 'attivo',
      fonte: 'manuale',
      scadeIl: null,
      seatsIncluded: piano === 'salone' ? 3 : 0,
      seatsExtra: 0,
      rinnovoAutomatico: false,
    },
  }
}

function spento(avviso: string | null): DecisioneBypass {
  return {
    ok: true,
    avviso,
    campi: {
      piano: 'base',
      stato: 'scaduto',
      fonte: null,
      scadeIl: null,
      seatsIncluded: 0,
      seatsExtra: 0,
      rinnovoAutomatico: false,
    },
  }
}

function spegni(doc: ProMain | undefined, testo: string, adesso: Date): DecisioneBypass {
  if (doc?.fonte === 'omaggio') return { ok: false, manca: 'vip' }
  if (!playConAccesso(doc, adesso)) return spento(null)
  const avviso = testo.trim()
  if (avviso.length < 1 || avviso.length > 400) return { ok: false, manca: 'testo' }
  return spento(avviso)
}

function playConAccesso(doc: ProMain | undefined, adesso: Date): boolean {
  if (doc?.fonte !== 'play') return false
  if (doc.stato === 'attivo' || doc.stato === 'grazia') return true
  if (doc.stato !== 'disdetto' || !doc.scadeIl) return false
  const fine = new Date(doc.scadeIl)
  return !Number.isNaN(fine.getTime()) && fine.getTime() > adesso.getTime()
}
