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
}

export interface PianoRichiesta {
  ok: true
  richiesta: Partial<RichiestaDoc> & { status: RichiestaDoc['status'] }
  appuntamento: 'crea' | 'conferma' | 'cancella' | 'niente'
  cane: 'crea' | 'riattiva' | 'niente'
  mail: 'conferma' | 'proposta' | 'rifiuto' | 'scadenza' | 'nessuna'
  scadeIl?: string
  inizio?: string
  fine?: string
}

type ErrorePiano = { ok: false; errore: 'stato' | 'scelta' | 'orario' | 'token' | 'scaduta' }

const ORA = 60 * 60 * 1000

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
        fine: new Date(inizio.getTime() + ORA).toISOString(),
      }
    }
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
      mail: 'rifiuto',
    }
  }

  return {
    ok: true,
    richiesta: { status: 'scaduta' },
    appuntamento: 'cancella',
    cane: 'niente',
    mail: 'scadenza',
  }
}
