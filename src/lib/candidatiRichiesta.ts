import { phoneDigits } from './dogList'

type Animale = {
  id: string
  name: string
  breed: string
  status: 'attivo' | 'non_in_cura' | 'deceduto'
  contact: { phone: string; email?: string }
}

export function candidatiRichiesta(animali: readonly Animale[], telefono: string, email: string): Animale[] {
  const cifre = phoneDigits(telefono)
  const posta = email.trim().toLowerCase()
  return animali
    .filter((animale) => animale.status !== 'deceduto')
    .filter((animale) => {
      const stessoTelefono = cifre !== '' && phoneDigits(animale.contact.phone) === cifre
      const stessaEmail = posta !== '' && (animale.contact.email ?? '').trim().toLowerCase() === posta
      return stessoTelefono || stessaEmail
    })
    .slice()
    .sort((a, b) => Number(a.status !== 'attivo') - Number(b.status !== 'attivo') || a.name.localeCompare(b.name, 'it'))
}
