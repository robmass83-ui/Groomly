export interface CompleannoCane {
  id: string
  name: string
  birthMonth?: number
  birthDay?: number
}

export interface PianoCompleanno {
  at: Date
  ids: string[]
  nomi: string[]
  /** Stesso giorno, dopo le 9: l’avviso parte tra un minuto. */
  subito: boolean
  path: string
}

function giornoValido(month: number, day: number, year: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const data = new Date(year, month - 1, day)
  if (data.getFullYear() !== year || data.getMonth() !== month - 1 || data.getDate() !== day) return null
  return data
}

function alleNove(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 9, 0, 0, 0)
}

function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Il prossimo avviso: alle 9 del compleanno, oppure tra un minuto se la giornata è già iniziata. */
export function pianoCompleanni(cani: CompleannoCane[], now: Date): PianoCompleanno | null {
  let scelto: { at: Date; subito: boolean; cani: CompleannoCane[] } | null = null
  for (const cane of cani) {
    if (cane.birthMonth === undefined || cane.birthDay === undefined) continue
    const questAnno = giornoValido(cane.birthMonth, cane.birthDay, now.getFullYear())
    if (!questAnno) continue
    const nove = alleNove(questAnno)
    let at = nove
    let subito = false
    if (stessoGiorno(questAnno, now) && nove.getTime() <= now.getTime()) {
      at = new Date(now.getTime() + 60_000)
      subito = true
    } else if (nove.getTime() <= now.getTime()) {
      const prossimo = giornoValido(cane.birthMonth, cane.birthDay, now.getFullYear() + 1)
      if (!prossimo) continue
      at = alleNove(prossimo)
    }
    if (!scelto || at.getTime() < scelto.at.getTime()) {
      scelto = { at, subito, cani: [cane] }
    } else if (scelto && stessoGiorno(at, scelto.at) && scelto.subito === subito) {
      scelto.cani.push(cane)
    }
  }
  if (!scelto) return null
  const ids = scelto.cani.map((cane) => cane.id)
  return {
    at: scelto.at,
    ids,
    nomi: scelto.cani.map((cane) => cane.name.trim()).filter(Boolean),
    subito: scelto.subito,
    path: ids.length === 1 ? `/animali/${ids[0]}` : '/animali',
  }
}
