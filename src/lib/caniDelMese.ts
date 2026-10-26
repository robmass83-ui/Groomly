export function caniToelettatiNelMese(
  visite: readonly { status: string; start: Date; dogId: string }[],
  specie: Readonly<Record<string, string | undefined>>,
  ora: Date,
): number {
  const anno = ora.getFullYear()
  const mese = ora.getMonth()
  const ids = new Set<string>()
  for (const visita of visite) {
    if (visita.status !== 'completato') continue
    if (visita.start.getFullYear() !== anno || visita.start.getMonth() !== mese) continue
    const tipo = specie[visita.dogId]
    if (tipo && tipo !== 'cane') continue
    ids.add(visita.dogId)
  }
  return ids.size
}
