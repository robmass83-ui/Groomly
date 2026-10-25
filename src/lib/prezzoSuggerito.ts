export function puoSuggerirePrezzo(cani: readonly { taglia: string; razza: string }[]): boolean {
  const gruppi = new Map<string, number>()
  for (const cane of cani) {
    const chiave = `${cane.taglia}|${cane.razza.trim().toLowerCase()}`
    gruppi.set(chiave, (gruppi.get(chiave) ?? 0) + 1)
  }
  return [...gruppi.values()].some((conto) => conto >= 3)
}
