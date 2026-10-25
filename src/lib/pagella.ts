export function nuovaPagellaVisibile(accesso: boolean): boolean {
  return accesso
}

export function pagelleInStorico<T extends { id: string }>(voci: readonly T[]): T[] {
  return [...voci]
}
