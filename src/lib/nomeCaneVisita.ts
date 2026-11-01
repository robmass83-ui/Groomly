import type { Dog } from '../types/models'

// «Cane eliminato» solo quando la lista cani è arrivata dal server: prima il cane può essere solo in arrivo.
export function nomeCaneVisita(
  dog: Dog | undefined,
  ospite: string,
  dalServer: boolean,
  frasi: { rigaCaneAssente: string; rigaCaneNeutro: string },
): string {
  if (dog) return dog.name
  if (ospite) return ospite
  return dalServer ? frasi.rigaCaneAssente : frasi.rigaCaneNeutro
}
