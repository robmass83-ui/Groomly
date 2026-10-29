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
}

export interface BucoAttesa {
  appointmentId: string
  inizio: Date
  nomeCaneDisdetto: string
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

export function idOfferta(appointmentId: string, iscrittoId: string): string {
  return `attesa:${appointmentId}:${iscrittoId}`
}
