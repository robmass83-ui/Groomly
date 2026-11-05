import { Capacitor } from '@capacitor/core'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { useFrasi } from '../../i18n/LinguaContext'
import { downloadAnchor, isShareCancel, shareFiles } from '../../lib/shareFile'
import { useToast } from '../layout/Toast'
import { Card, Row } from '../ui/Card'

/** Per chi non vede il backup del salone: scarica i dati del proprio account. */
export function ScaricaAccount() {
  const frasi = useFrasi()
  const toast = useToast()
  const [occupato, setOccupato] = useState(false)
  if (!firebaseEnabled()) return null

  async function scarica() {
    if (occupato) return
    setOccupato(true)
    try {
      const mod = await import('../../data/firebase/client')
      const dati = await mod.leggiMioAccount()
      const file = { blob: new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' }), name: 'groomly-account.json' }
      if (Capacitor.isNativePlatform()) await shareFiles([file], frasi.accScarica)
      else downloadAnchor(file.blob, file.name)
    } catch (error) {
      if (!isShareCancel(error)) toast.show(frasi.lisExportKo, 'plain')
    } finally {
      setOccupato(false)
    }
  }

  return (
    <Card>
      <Row style={{ borderTop: 'none', minHeight: 52 }}>
        <button
          type="button"
          disabled={occupato}
          onClick={() => { void scarica() }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0, textAlign: 'left', minHeight: 44 }}
        >
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span>{frasi.accScarica}</span>
            <small style={{ color: 'var(--tx3)' }}>{frasi.accScaricaAccount}</small>
          </span>
          <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
        </button>
      </Row>
    </Card>
  )
}
