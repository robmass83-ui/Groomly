import { useState } from 'react'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import { SHARED_SALON_ID } from '../../lib/salonPath'
import type { Dog } from '../../types/models'
import { useToast } from '../layout/Toast'
import { Toggle } from '../ui/Toggle'

// L'interruttore vale per l'indirizzo: il server lo applica a tutti i cani del cliente.
export function EmailCliente({ dog, salvaLocale }: { dog: Dog; salvaLocale: (bloccata: boolean) => boolean }) {
  const frasi = useFrasi()
  const toast = useToast()
  const { gate } = useSession()
  const [scelta, setScelta] = useState<boolean | null>(null)
  const account = gate.kind === 'in' ? gate.account : null
  const email = dog.contact.email?.trim() ?? ''
  if (email === '' || account?.role === 'collaboratore' || account?.salonId === SHARED_SALON_ID) return null
  const accese = scelta ?? dog.emailBloccata !== true

  async function cambia(acceso: boolean) {
    setScelta(acceso)
    try {
      if (firebaseEnabled()) {
        const mod = await import('../../data/firebase/client')
        await mod.callImpostaEmailCliente(dog.id, !acceso)
      } else if (!salvaLocale(!acceso)) {
        throw new Error('salvataggio')
      }
    } catch {
      setScelta(!acceso)
      toast.show(frasi.authSalvataggio, 'plain')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48 }}>
      <span style={{ fontWeight: 700, color: 'var(--tx2)' }}>{frasi.mailCliente}</span>
      <Toggle checked={accese} label={frasi.mailCliente} onChange={(acceso) => { void cambia(acceso) }} />
    </div>
  )
}
