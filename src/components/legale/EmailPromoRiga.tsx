import { useState } from 'react'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import { useToast } from '../layout/Toast'
import { Row } from '../ui/Card'
import { Toggle } from '../ui/Toggle'

export function EmailPromoRiga() {
  const frasi = useFrasi()
  const toast = useToast()
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const [scelta, setScelta] = useState<boolean | null>(null)
  if (!account || !firebaseEnabled()) return null
  const acceso = scelta ?? account.emailPromo?.attivo === true

  async function cambia(valore: boolean) {
    if (!account) return
    setScelta(valore)
    try {
      const mod = await import('../../data/firebase/client')
      await mod.callImpostaEmailPromo(valore, 'account')
      session.replaceAccount({ ...account, emailPromo: { attivo: valore, at: new Date().toISOString(), fonte: 'account' } })
    } catch {
      setScelta(!valore)
      toast.show(frasi.authSalvataggio, 'plain')
    }
  }

  return (
    <Row style={{ minHeight: 52 }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span>{frasi.accEmailPromo}</span>
        <small style={{ color: 'var(--tx3)' }}>{frasi.accEmailPromoDettaglio}</small>
      </span>
      <Toggle checked={acceso} label={frasi.accEmailPromo} onChange={(valore) => { void cambia(valore) }} />
    </Row>
  )
}
