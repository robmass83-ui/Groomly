import { useEffect, useState } from 'react'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import { SHARED_SALON_ID, normalizeEmail } from '../../lib/salonPath'
import type { Dog } from '../../types/models'
import { useToast } from '../layout/Toast'
import { Toggle } from '../ui/Toggle'

// L'interruttore vale per l'indirizzo: il server lo applica a tutti i cani del cliente.
export function EmailCliente({ dog, salvaLocale }: { dog: Dog; salvaLocale: (bloccata: boolean) => boolean }) {
  const frasi = useFrasi()
  const toast = useToast()
  const { gate } = useSession()
  const [scelta, setScelta] = useState<boolean | null>(null)
  const [inElenco, setInElenco] = useState(false)
  const [dalCliente, setDalCliente] = useState(false)
  const account = gate.kind === 'in' ? gate.account : null
  const email = dog.contact.email?.trim() ?? ''
  const nascosto = email === '' || account?.role === 'collaboratore' || account?.salonId === SHARED_SALON_ID

  // Un cane aggiunto dopo il blocco non ha il segno: conta l'elenco degli indirizzi del salone.
  useEffect(() => {
    if (nascosto || !firebaseEnabled()) return
    let vivo = true
    void import('../../data/firebase/client')
      .then((mod) => mod.readSalonCollection('emailBloccate'))
      .then((voci) => {
        const voce = voci.find((item) => typeof item.data.email === 'string' && normalizeEmail(item.data.email) === normalizeEmail(email))
        if (!vivo) return
        setInElenco(voce !== undefined)
        setDalCliente(voce?.data.fonte === 'link')
      })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [nascosto, email])

  if (nascosto) return null
  const accese = scelta ?? (dog.emailBloccata !== true && !inElenco)

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
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 700, color: 'var(--tx2)' }}>{frasi.mailCliente}</span>
        {dalCliente ? <small style={{ color: 'var(--tx3)' }}>{frasi.mailDisiscritto}</small> : null}
      </span>
      <Toggle checked={accese} label={frasi.mailCliente} disabled={dalCliente} onChange={(acceso) => { void cambia(acceso) }} />
    </div>
  )
}
