import { telefonoValido } from './validazioni'

export type SpecieAttesa = 'cane' | 'gatto' | 'altro'
export type TagliaAttesa = 'piccola' | 'media' | 'grande'

export interface IscrittoAttesa {
  id: string
  nome: string
  phone: string
  email: string
  nomeCane: string
  specie: SpecieAttesa
  taglia: TagliaAttesa
  servizioId: string
  trattamento: string
  durataMin: number
  creatoIl: string
  /** La settimana (lun–dom, date di Roma) per cui si è iscritto; senza, riceve i posti di qualunque giorno. */
  settimana?: { inizio: string, fine: string }
}

export interface BucoAttesa {
  appointmentId: string
  inizio: Date
  nomeCaneDisdetto: string
  /** Il momento in cui il posto si è liberato; chi si è iscritto dopo non riceve l'offerta. */
  apertoIl?: Date
}

export type MotivoPosto = 'libero' | 'passato' | 'occupato' | 'non_ci_sta'

function parseYmd(ymd: string): { y: number, m: number, d: number } {
  const [y, m, d] = ymd.split('-').map(Number)
  return { y, m, d }
}

function formatYmdUtc(d: Date): string {
  const y = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${month}-${day}`
}

function addDaysUtc(y: number, m: number, d: number, delta: number): Date {
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + delta)
  return t
}

export function settimanaDi(giorno: string): { inizio: string, fine: string } {
  const { y, m, d } = parseYmd(giorno)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const deltaMonday = dow === 0 ? -6 : 1 - dow
  const lunedi = addDaysUtc(y, m, d, deltaMonday)
  const domenica = addDaysUtc(lunedi.getUTCFullYear(), lunedi.getUTCMonth() + 1, lunedi.getUTCDate(), 6)
  return { inizio: formatYmdUtc(lunedi), fine: formatYmdUtc(domenica) }
}

function ymdReale(valore: unknown): { y: number, m: number, d: number } | null {
  if (typeof valore !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) return null
  const { y, m, d } = parseYmd(valore)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? { y, m, d } : null
}

/** Una settimana accettata solo se sono due date vere, in ordine, a non più di 6 giorni; si restituisce una copia coi soli due campi. */
export function settimanaValida(valore: unknown): { inizio: string, fine: string } | null {
  if (typeof valore !== 'object' || valore === null) return null
  const { inizio, fine } = valore as Record<string, unknown>
  const a = ymdReale(inizio)
  const b = ymdReale(fine)
  if (!a || !b || typeof inizio !== 'string' || typeof fine !== 'string' || inizio > fine) return null
  const giorni = (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000
  return giorni <= 6 ? { inizio, fine } : null
}

/** Il posto è di quella settimana (giorno di Roma, estremi compresi); senza settimana vale ogni giorno. */
export function nellaSettimana(inizio: Date, settimana: { inizio: string, fine: string } | undefined): boolean {
  if (!settimana) return true
  const giorno = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(inizio)
  return giorno >= settimana.inizio && giorno <= settimana.fine
}

export function settimanaPiena(giorniConOrari: readonly string[], settimana: { inizio: string, fine: string }): boolean {
  return !giorniConOrari.some((g) => g >= settimana.inizio && g <= settimana.fine)
}

export function campiMancanti(gia: { nome?: string, phone?: string, email?: string, nomeCane?: string }): Array<'nome' | 'phone' | 'email' | 'nomeCane'> {
  const out: Array<'nome' | 'phone' | 'email' | 'nomeCane'> = []
  if (!gia.nome) out.push('nome')
  if (!gia.phone) out.push('phone')
  if (!gia.email) out.push('email')
  if (!gia.nomeCane) out.push('nomeCane')
  return out
}

export function oraAncoraDavanti(inizio: Date, adesso: Date): boolean {
  return inizio.getTime() > adesso.getTime()
}

export function ciSta(inizio: Date, durataMin: number, prossimoInizio: Date | null): boolean {
  if (prossimoInizio === null) return true
  return inizio.getTime() + durataMin * 60_000 <= prossimoInizio.getTime()
}

export function motivoPosto(input: { inizio: Date, adesso: Date, durataMin: number, prossimoInizio: Date | null, preso: boolean }): MotivoPosto {
  const { inizio, adesso, durataMin, prossimoInizio, preso } = input
  if (inizio.getTime() <= adesso.getTime()) return 'passato'
  if (preso) return 'occupato'
  if (!ciSta(inizio, durataMin, prossimoInizio)) return 'non_ci_sta'
  return 'libero'
}

/** Cosa mostra la pagina del link: la conferma se il posto è libero, altrimenti la proposta di restare in lista. */
export function schermataAttesa(motivo: MotivoPosto): 'conferma' | 'resta' {
  return motivo === 'libero' ? 'conferma' : 'resta'
}

export interface BucoAttesaDoc {
  appointmentId: string
  inizio: string
  nomeCane: string
  creatoIl?: string
}

export function inizioDaDoc(valore: unknown): Date | null {
  if (valore instanceof Date) return Number.isNaN(valore.getTime()) ? null : valore
  if (typeof valore === 'number' && Number.isFinite(valore)) return new Date(valore)
  if (typeof valore === 'string') {
    const data = new Date(valore)
    return Number.isNaN(data.getTime()) ? null : data
  }
  return null
}

/** Il segno da lasciare quando una visita sparisce: solo se l'ora era ancora davanti. */
export function bucoLasciato(input: { appointmentId: string, inizio: Date | null, nomeCane: string, adesso: Date }): BucoAttesaDoc | null {
  const { appointmentId, inizio, nomeCane, adesso } = input
  if (appointmentId === '' || appointmentId.includes('/') || !inizio || !oraAncoraDavanti(inizio, adesso)) return null
  return { appointmentId, inizio: inizio.toISOString(), nomeCane }
}

/** Lo spostamento lascia il segno sull'ora vecchia, se è cambiata ed era ancora davanti. */
export function bucoDaSpostamento(input: { appointmentId: string, vecchio: Date | null, nuovo: Date, nomeCane: string, adesso: Date }): BucoAttesaDoc | null {
  if (!input.vecchio || input.vecchio.getTime() === input.nuovo.getTime()) return null
  return bucoLasciato({ appointmentId: input.appointmentId, inizio: input.vecchio, nomeCane: input.nomeCane, adesso: input.adesso })
}

export function idOfferta(appointmentId: string, iscrittoId: string): string {
  return `attesa:${appointmentId}:${iscrittoId}`
}

const SPECIE_ATTESA: readonly string[] = ['cane', 'gatto', 'altro']
const TAGLIE_ATTESA: readonly string[] = ['piccola', 'media', 'grande']

/** Il modulo del salone per chi è lì in negozio: tutto pieno, trattamento scelto, specie e taglia che esistono. Il catalogo non c'entra. */
export function iscrizioneManualeValida(input: {
  nome: string
  phone: string
  email: string
  nomeCane: string
  servizioId: string
  taglia: string
  specie: string
}): boolean {
  const pieni = [input.nome, input.phone, input.email, input.nomeCane, input.servizioId].every((campo) => typeof campo === 'string' && campo.trim() !== '')
  return pieni && telefonoValido(input.phone) && SPECIE_ATTESA.includes(input.specie) && TAGLIE_ATTESA.includes(input.taglia)
}
