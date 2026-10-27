import { emailValida, eventoDi, unisciRiga, type RigaCoda } from './codaEmail'
import { romeDay, romeIso } from './romeTime'
import type { SceltaServizio } from './serviziEmail'

export interface VisitaPromemoria {
  id: string
  dogId: string
  start: Date
  status: string
  nomeCane: string
  email?: string
}

function giornoMeno(giorno: string, anticipo: number): string {
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  const data = new Date(Date.UTC(anno, mese - 1, giornoMese))
  data.setUTCDate(data.getUTCDate() - anticipo)
  return data.toISOString().slice(0, 10)
}

function minutiOffset(iso: string): number {
  const match = /([+-])(\d{2}):(\d{2})$/.exec(iso)
  if (!match) return 0
  const segno = match[1] === '-' ? -1 : 1
  return segno * (Number(match[2]) * 60 + Number(match[3]))
}

function istanteRoma(giorno: string, ora: string): string {
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  const [ore, minuti] = ora.split(':').map(Number)
  const civile = Date.UTC(anno, mese - 1, giornoMese, ore, minuti, 0)
  const sonda = new Date(Date.UTC(anno, mese - 1, giornoMese, 12, 0, 0))
  let utc = civile - minutiOffset(romeIso(sonda)) * 60_000
  const orologio = `${giorno}T${String(ore).padStart(2, '0')}:${String(minuti).padStart(2, '0')}:00`
  if (!romeIso(new Date(utc)).startsWith(orologio)) {
    utc = civile - minutiOffset(romeIso(new Date(utc))) * 60_000
  }
  return new Date(utc).toISOString()
}

function parteIlAutomatico(giornoVisita: string, scelta: SceltaServizio): string {
  const anticipo = scelta.anticipoGiorni ?? 1
  const ora = scelta.ora ?? '18:00'
  return istanteRoma(giornoMeno(giornoVisita, anticipo), ora)
}

function chiudiAperti(righe: readonly RigaCoda[], appointmentId: string, eventoTenuto?: string): RigaCoda[] {
  return righe.map((riga) => {
    if (riga.tipo !== 'promemoria' || riga.appointmentId !== appointmentId) return riga
    if (riga.stato === 'inviata' || riga.stato === 'chiusa') return riga
    if (eventoTenuto !== undefined && riga.evento === eventoTenuto) return riga
    return { ...riga, stato: 'chiusa' }
  })
}

export function righePromemoria(
  visite: readonly VisitaPromemoria[],
  scelta: SceltaServizio,
  esistenti: readonly RigaCoda[],
): RigaCoda[] {
  if (scelta.modo === 'spento') return [...esistenti]

  let righe: RigaCoda[] = [...esistenti]
  for (const visita of visite) {
    if (visita.status !== 'programmato') {
      righe = chiudiAperti(righe, visita.id)
      continue
    }

    const giorno = romeDay(visita.start)
    const evento = eventoDi('promemoria', { appointmentId: visita.id, giorno })
    const parteIl = scelta.modo === 'automatico' ? parteIlAutomatico(giorno, scelta) : null
    righe = chiudiAperti(righe, visita.id, evento)
    righe = righe.map((riga) =>
      riga.evento === evento && riga.stato === 'in_coda' ? { ...riga, parteIl } : riga,
    )
    const email = visita.email ?? ''
    righe = unisciRiga(righe, {
      id: evento,
      tipo: 'promemoria',
      dogId: visita.dogId,
      appointmentId: visita.id,
      evento,
      parteIl,
      stato: 'in_coda',
      motivo: emailValida(email) ? '' : 'manca_email',
      email,
      nomeCane: visita.nomeCane,
    })
  }
  return righe
}
