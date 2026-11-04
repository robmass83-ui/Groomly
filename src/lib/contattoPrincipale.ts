import type { DogContact } from '../types/models'
import { ruoloDelProprietario } from './ruoloProprietario'

interface Titolare { name: string; phone: string }

/**
 * Scambia il proprietario con un contatto extra: l'extra scelto diventa la voce
 * principale (dove stava la vecchia) e il vecchio proprietario prende il suo posto.
 */
export function rendiPrincipale(
  contacts: DogContact[],
  owner: Titolare,
  id: string,
): { contacts: DogContact[]; owner: Titolare } | null {
  const scelto = contacts.find((contact) => contact.id === id && !contact.isPrimary)
  if (!scelto) return null
  const vecchio = contacts.find((contact) => contact.isPrimary)
  const occupati = new Set(contacts.filter((contact) => contact !== vecchio).map((contact) => contact.id))
  const base = vecchio?.id ?? 'primary'
  const nuovoPrincipale: DogContact = { id: scelto.id, name: scelto.name, role: scelto.role, phone: scelto.phone, isPrimary: true }
  const exProprietario: DogContact = {
    id: occupati.has(base) ? crypto.randomUUID() : base,
    name: owner.name,
    role: vecchio?.role.trim() ? vecchio.role : ruoloDelProprietario(owner.name),
    phone: owner.phone,
    isPrimary: false,
  }
  const out = contacts.map((contact) => {
    if (contact === vecchio) return nuovoPrincipale
    if (contact === scelto) return exProprietario
    return { ...contact }
  })
  if (!vecchio) out.unshift(nuovoPrincipale)
  // Proprietario senza nome né telefono: niente contatto vuoto al posto dell'extra scelto.
  const proprietarioVuoto = owner.name.trim() === '' && owner.phone.trim() === ''
  const finale = proprietarioVuoto ? out.filter((contact) => contact !== exProprietario) : out
  return { contacts: finale, owner: { name: scelto.name, phone: scelto.phone } }
}
