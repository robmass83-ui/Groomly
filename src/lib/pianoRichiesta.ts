import { istanteRoma } from './disponibilita'
import { tempoRisposta } from './tempoRisposta'

export type SceltaAnimale = { tipo: 'nuovo' } | { tipo: 'esistente'; dogId: string }

export type ComandoRichiesta =
  | { azione: 'accetta'; scelta: SceltaAnimale }
  | { azione: 'proponi'; scelta: SceltaAnimale; giorno: string; ora: string }
  | { azione: 'rifiuta' }
  | { azione: 'confermaCliente' }
  | { azione: 'rifiutaCliente' }
  | { azione: 'scade' }

export interface RichiestaDoc {
  status: 'nuova' | 'accettata' | 'proposta' | 'rifiutata' | 'scaduta'
  token: string
  nome: string
  phone: string
  email: string
  cane: string
  razza: string
  specie: 'cane' | 'gatto' | 'altro'
  taglia: 'piccola' | 'media' | 'grande'
  foto: string[]
  start: string
  end: string
  sceltaAnimale?: 'nuovo' | string
  appointmentId?: string
  scadeIl?: string
  durataMin?: number
  voci?: VoceRichiestaSalvata[]
}

export interface VoceRichiestaSalvata {
  id: string
  nome: string
  kind: 'principale' | 'extra'
  minuti: number
  prezzo: number
}

export interface PianoRichiesta {
  ok: true
  richiesta: Partial<RichiestaDoc> & { status: RichiestaDoc['status'] }
  appuntamento: 'crea' | 'conferma' | 'cancella' | 'niente'
  cane: 'crea' | 'riattiva' | 'niente'
  mail: 'conferma' | 'proposta' | 'rifiuto' | 'liberato' | 'scadenza' | 'nessuna'
  scadeIl?: string
  inizio?: string
  fine?: string
}

type ErrorePiano = { ok: false; errore: 'stato' | 'scelta' | 'orario' | 'token' | 'scaduta' }

export function vociSalvate(value: unknown): VoceRichiestaSalvata[] {
  if (!Array.isArray(value)) return []
  const voci: VoceRichiestaSalvata[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const voce = item as Record<string, unknown>
    const id = typeof voce.id === 'string' ? voce.id.trim() : ''
    const nome = typeof voce.nome === 'string' ? voce.nome.trim() : ''
    const kind = voce.kind === 'principale' || voce.kind === 'extra' ? voce.kind : ''
    const minuti = typeof voce.minuti === 'number' && Number.isFinite(voce.minuti) ? voce.minuti : Number.NaN
    const prezzo = typeof voce.prezzo === 'number' && Number.isFinite(voce.prezzo) ? voce.prezzo : Number.NaN
    if (!/^[a-z0-9-]{1,40}$/.test(id) || nome === '' || nome.length > 80 || kind === '') continue
    if (minuti < 1 || minuti > 600 || prezzo <= 0 || prezzo > 10000) continue
    voci.push({ id, nome, kind, minuti: Math.round(minuti), prezzo })
    if (voci.length === 8) break
  }
  return voci
}

const TOELETTATURA = [{ serviceId: 'prenotazione', name: 'Toelettatura', durationMin: 60, price: 0 }]

export function serviziDellaRichiesta(voci: VoceRichiestaSalvata[] | undefined): { serviceId: string; name: string; durationMin: number; price: number }[] {
  if (!voci || voci.length === 0) return TOELETTATURA.map((riga) => ({ ...riga }))
  return voci.map((voce) => ({ serviceId: voce.id, name: voce.nome, durationMin: voce.minuti, price: voce.prezzo }))
}

export function minutiRichiesta(durataMin: number | undefined): number {
  return typeof durataMin === 'number' && Number.isFinite(durataMin) && durataMin >= 1 ? durataMin : 60
}

function errore(codice: ErrorePiano['errore']): ErrorePiano {
  return { ok: false, errore: codice }
}

function valoreScelta(scelta: SceltaAnimale | undefined): string | null {
  if (scelta?.tipo === 'nuovo') return 'nuovo'
  if (scelta?.tipo === 'esistente' && scelta.dogId) return scelta.dogId
  return null
}

function caneDefinitivo(sceltaAnimale: string | undefined, animaleArchivio: boolean): 'crea' | 'riattiva' | 'niente' | null {
  if (sceltaAnimale === 'nuovo') return 'crea'
  if (!sceltaAnimale) return null
  return animaleArchivio ? 'riattiva' : 'niente'
}

function finestraChiusa(scadeIl: string | undefined, adesso: Date): boolean {
  if (!scadeIl) return true
  const quando = new Date(scadeIl).getTime()
  if (Number.isNaN(quando)) return true
  return quando <= adesso.getTime()
}

function tokenValido(token: string, atteso: string): boolean {
  return token !== '' && token === atteso
}

export function pianoRichiesta(input: {
  richiesta: RichiestaDoc
  comando: ComandoRichiesta
  token: string
  adesso: Date
  orarioLibero: boolean
  animaleArchivio: boolean
}): PianoRichiesta | ErrorePiano {
  const { richiesta, comando, token, adesso, orarioLibero, animaleArchivio } = input
  const dalSalone = comando.azione === 'accetta' || comando.azione === 'proponi' || comando.azione === 'rifiuta'
  if (dalSalone) {
    if (richiesta.status !== 'nuova') return errore('stato')
  } else if (richiesta.status !== 'proposta') {
    return errore('stato')
  }

  if (comando.azione === 'confermaCliente' || comando.azione === 'rifiutaCliente') {
    if (!tokenValido(token, richiesta.token)) return errore('token')
    if (finestraChiusa(richiesta.scadeIl, adesso)) return errore('scaduta')
  }

  if (comando.azione === 'accetta' || comando.azione === 'proponi') {
    const scelta = valoreScelta(comando.scelta)
    if (!scelta) return errore('scelta')
    if (comando.azione === 'proponi') {
      const inizio = istanteRoma(comando.giorno, comando.ora)
      const risposta = tempoRisposta(adesso, inizio)
      if (!orarioLibero || !risposta) return errore('orario')
      const scadeIl = risposta.scade.toISOString()
      return {
        ok: true,
        richiesta: { status: 'proposta', sceltaAnimale: scelta, scadeIl },
        appuntamento: 'crea',
        cane: 'niente',
        mail: 'proposta',
        scadeIl,
        inizio: inizio.toISOString(),
        fine: new Date(inizio.getTime() + minutiRichiesta(richiesta.durataMin) * 60 * 1000).toISOString(),
      }
    }
    const inizioRichiesta = new Date(richiesta.start).getTime()
    if (!(inizioRichiesta > adesso.getTime())) return errore('orario')
    if (!orarioLibero) return errore('orario')
    const cane = caneDefinitivo(scelta, animaleArchivio)
    if (!cane) return errore('scelta')
    return {
      ok: true,
      richiesta: { status: 'accettata', sceltaAnimale: scelta },
      appuntamento: 'crea',
      cane,
      mail: 'conferma',
    }
  }

  if (comando.azione === 'rifiuta') {
    return {
      ok: true,
      richiesta: { status: 'rifiutata' },
      appuntamento: 'niente',
      cane: 'niente',
      mail: 'rifiuto',
    }
  }

  if (comando.azione === 'confermaCliente') {
    const cane = caneDefinitivo(richiesta.sceltaAnimale, animaleArchivio)
    if (!cane) return errore('scelta')
    return {
      ok: true,
      richiesta: { status: 'accettata' },
      appuntamento: 'conferma',
      cane,
      mail: 'nessuna',
    }
  }

  if (comando.azione === 'rifiutaCliente') {
    return {
      ok: true,
      richiesta: { status: 'rifiutata' },
      appuntamento: 'cancella',
      cane: 'niente',
      mail: 'liberato',
    }
  }

  return {
    ok: true,
    richiesta: { status: 'scaduta' },
    appuntamento: 'cancella',
    cane: 'niente',
    mail: 'liberato',
  }
}
