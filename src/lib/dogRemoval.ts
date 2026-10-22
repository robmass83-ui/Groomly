export function finishDogRemoval(actions: { removeDog: () => boolean; dropVisits: () => boolean }): boolean {
  if (!actions.removeDog()) return false
  try {
    actions.dropVisits()
  } catch {
    // Le visite non riportano il cane in lista.
  }
  return true
}
