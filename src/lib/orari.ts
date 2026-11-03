import { addDays } from 'date-fns'

export type Fascia = { da: string; a: string }
export type Giorno = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type OrariSettimana = Partial<Record<Giorno, Fascia[]>>

function minuti(hhmm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) return null
  const ore = Number(match[1])
  const min = Number(match[2])
  if (ore > 23 || min > 59) return null
  return ore * 60 + min
}

export function giornoChiuso(fasce: readonly Fascia[] | undefined): boolean {
  return !fasce || fasce.length === 0
}

export function orariCompilati(orari: OrariSettimana | undefined): boolean {
  if (!orari) return false
  return (Object.values(orari) as Fascia[][]).some((fasce) => fasce.length > 0)
}

export function copiaSuTutti(fasce: readonly Fascia[]): OrariSettimana {
  const copia = fasce.map((fascia) => ({ ...fascia }))
  const tutti: OrariSettimana = {}
  for (let giorno = 0; giorno < 7; giorno += 1) tutti[giorno as Giorno] = copia.map((fascia) => ({ ...fascia }))
  return tutti
}

export function dentroFascia(fasce: readonly Fascia[], hhmm: string): boolean {
  const punto = minuti(hhmm)
  if (punto === null) return false
  return fasce.some((fascia) => {
    const da = minuti(fascia.da)
    const a = minuti(fascia.a)
    return da !== null && a !== null && da <= punto && punto < a
  })
}

export function proponibile(orari: OrariSettimana | undefined, giorno: Date, hhmm: string): boolean {
  if (!orariCompilati(orari)) return true
  const fasce = orari?.[giorno.getDay() as Giorno]
  if (giornoChiuso(fasce)) return false
  return dentroFascia(fasce ?? [], hhmm)
}

function minutiDelGiorno(data: Date): number {
  return data.getHours() * 60 + data.getMinutes()
}

/** Se la visita sfora la chiusura della fascia che contiene l'inizio, l'ora di chiusura «HH:MM». */
export function chiusuraSuperata(orari: OrariSettimana | undefined, inizio: Date, fine: Date): string | null {
  if (!orariCompilati(orari)) return null
  const fasce = orari?.[inizio.getDay() as Giorno]
  if (giornoChiuso(fasce)) return null
  const dalGiornoDiInizio = minutiDelGiorno(inizio)
  const giorniDiDifferenza = Math.round((new Date(fine.getFullYear(), fine.getMonth(), fine.getDate()).getTime() - new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate()).getTime()) / 86_400_000)
  const fineInMinuti = giorniDiDifferenza * 1440 + minutiDelGiorno(fine)
  for (const fascia of fasce ?? []) {
    const da = minuti(fascia.da)
    const a = minuti(fascia.a)
    if (da === null || a === null || dalGiornoDiInizio < da || dalGiornoDiInizio >= a) continue
    return fineInMinuti > a ? fascia.a : null
  }
  return null
}

/** Il giorno stesso se è aperto (o gli orari non ci sono), altrimenti il primo aperto dei 6 seguenti. */
export function prossimoGiornoAperto(orari: OrariSettimana | undefined, da: Date): Date {
  if (!orariCompilati(orari)) return da
  for (let passo = 0; passo < 7; passo += 1) {
    const candidato = addDays(da, passo)
    if (!giornoChiuso(orari?.[candidato.getDay() as Giorno])) return candidato
  }
  return da
}

/** L'ora di apertura del giorno: il `da` della prima fascia. */
export function primaApertura(orari: OrariSettimana | undefined, giorno: Date): string | null {
  return orari?.[giorno.getDay() as Giorno]?.[0]?.da ?? null
}
