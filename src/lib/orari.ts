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
