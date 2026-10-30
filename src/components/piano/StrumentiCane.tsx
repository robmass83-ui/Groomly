import { UserX } from 'lucide-react'
import { useFrasi } from '../../i18n/LinguaContext'
import { useSettings } from '../../hooks/useSettings'
import { dateNonVenuti, nonVenutiRecenti } from '../../lib/affidabilita'
import { usePiano } from '../../hooks/usePiano'
import { strumentoVisibile } from '../../lib/funzioniPiano'
import { TYPE } from '../../theme/theme'

export function StrumentiCane({
  dogId,
  appuntamenti,
  adesso = new Date(),
}: {
  dogId: string
  appuntamenti: readonly { dogId: string; status: string; start: Date }[]
  adesso?: Date
}) {
  const frasi = useFrasi()
  const { settings } = useSettings()
  const piano = usePiano()
  if (!strumentoVisibile('affidabilita', settings, piano.funzioni)) return null
  const assenze = nonVenutiRecenti(dateNonVenuti(appuntamenti, dogId), adesso)
  if (assenze < 3) return null

  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--bad-s)', color: 'var(--bad)', border: '1px solid var(--bad)', borderRadius: 22, padding: '12px 14px' }}>
      <UserX size={20} strokeWidth={2.2} aria-hidden style={{ flex: 'none', marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800 }}>{frasi.strumSpesso}</div>
        <div style={{ fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.strumSpessoDettaglio.replace('{{n}}', String(assenze))}</div>
      </div>
    </div>
  )
}
